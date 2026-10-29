"""Optional, token-protected loopback evidence bridge for Lemmata.

No draft or model credentials are accepted. Retrieval is restricted to approved
HTTPS origins, public DNS results pinned in Chromium, and text-only requests.
"""
import argparse
import asyncio
import hmac
import importlib.util
import ipaddress
import json
import os
import re
import socket
import threading
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlsplit


def approved_url(value):
    if not isinstance(value, str) or len(value) > 2048:
        raise ValueError('Invalid URL')
    url = urlsplit(value)
    host = (url.hostname or '').rstrip('.').lower()
    if url.scheme != 'https' or not host or url.username or url.password or url.port not in (None, 443):
        raise ValueError('Only public HTTPS URLs on port 443 are supported')
    if host == 'localhost' or host.endswith(('.localhost', '.local')):
        raise ValueError('Local destinations are not allowed')
    if url.hostname.endswith('.') or not re.fullmatch(r'[a-z0-9.-]+', host):
        raise ValueError('Use an ordinary public ASCII or punycode hostname')
    addresses = {item[4][0] for item in socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)}
    if not addresses or any(not ipaddress.ip_address(address).is_global for address in addresses):
        raise ValueError('Private, local, or reserved addresses are not allowed')
    # Prefer IPv4 to keep Chromium host resolver rules portable.
    address = next((item for item in addresses if ':' not in item), None)
    if not address:
        raise ValueError('This bridge currently requires a public IPv4 address')
    return host, address


async def collect(urls):
    from crawl4ai import AsyncWebCrawler, BrowserConfig, CrawlerRunConfig, CacheMode
    pinned = {}
    for url in urls:
        host, address = approved_url(url)
        pinned[host] = address
    rules = ','.join('MAP ' + host + ' ' + address for host, address in pinned.items())
    browser = BrowserConfig(headless=True, java_script_enabled=False, ignore_https_errors=False, verbose=False,
                            text_mode=True, extra_args=['--host-resolver-rules=' + rules, '--no-proxy-server', '--disable-background-networking', '--disable-quic'])
    async with AsyncWebCrawler(config=browser) as crawler:
        async def restrict(page, context, **_):
            session = await context.new_cdp_session(page)
            await session.send('Network.enable')
            received = 0
            def count_bytes(event):
                nonlocal received
                received += max(event.get('dataLength', 0), event.get('encodedDataLength', 0))
                if received > 2_000_000 and not page.is_closed():
                    asyncio.create_task(page.close())
            session.on('Network.dataReceived', count_bytes)
            async def route_request(route):
                parsed = urlsplit(route.request.url)
                host = (parsed.hostname or '').rstrip('.').lower()
                if parsed.scheme == 'https' and host in pinned and parsed.port in (None, 443) and not parsed.username and not parsed.password and route.request.resource_type == 'document' and route.request.frame.parent_frame is None:
                    await route.continue_()
                else:
                    await route.abort()
            await context.route('**/*', route_request)
            return page
        crawler.crawler_strategy.set_hook('on_page_context_created', restrict)
        sources = []
        for url in urls:
            result = await asyncio.wait_for(crawler.arun(url=url, config=CrawlerRunConfig(page_timeout=20000, cache_mode=CacheMode.BYPASS, check_robots_txt=False, verbose=False)), timeout=25000)
            if not result.success:
                raise ValueError('A source could not be retrieved. Check access and approved redirect origins.')
            markdown = result.markdown
            text = markdown.raw_markdown if hasattr(markdown, 'raw_markdown') else str(markdown)
            if len(text) > 2_000_000:
                raise ValueError('Source text exceeds the bridge limit')
            final_url = getattr(result, 'redirected_url', None) or result.url or url
            final_host = (urlsplit(final_url).hostname or '').rstrip('.').lower()
            if final_host not in pinned or urlsplit(final_url).scheme != 'https':
                raise ValueError('A source redirected outside the approved origins')
            sources.append({'url': final_url, 'title': str((result.metadata or {}).get('title', final_url))[:200],
                            'text': text[:10000], 'retrievedAt': datetime.now(timezone.utc).isoformat()})
        return sources


def serve(port, token):
    gate = threading.BoundedSemaphore(1)
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Do not put source URLs or access tokens in request logs.

        def reply(self, status, data):
            payload = json.dumps(data).encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

        def authorized(self):
            if self.headers.get('Host') not in (f'127.0.0.1:{port}', f'localhost:{port}'):
                self.reply(403, {'error': 'Invalid local host'}); return False
            if self.headers.get('Origin') or not hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token):
                self.reply(401, {'error': 'Crawler token required'}); return False
            return True

        def do_GET(self):
            if not self.authorized(): return
            if self.path != '/health': self.reply(404, {'error': 'Not found'}); return
            self.reply(200, {'ok': True, 'ready': importlib.util.find_spec('crawl4ai') is not None})

        def do_POST(self):
            if not self.authorized(): return
            if self.path != '/evidence': self.reply(404, {'error': 'Not found'}); return
            if not gate.acquire(blocking=False): self.reply(429, {'error': 'Crawler is busy'}); return
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if length < 1 or length > 16000: raise ValueError('Invalid body size')
                self.connection.settimeout(10)
                body = json.loads(self.rfile.read(length))
                urls = body.get('urls')
                if not isinstance(urls, list) or not 1 <= len(urls) <= 5: raise ValueError('Approve one to five URLs')
                for url in urls: approved_url(url)
                if importlib.util.find_spec('crawl4ai') is None: raise ValueError('Install Crawl4AI and run crawl4ai-setup first')
                sources = asyncio.run(asyncio.wait_for(collect(urls), timeout=110))
                self.reply(200, {'sources': sources})
            except Exception as error:
                self.reply(400, {'error': str(error)[:500]})
            finally:
                gate.release()
    server = ThreadingHTTPServer(('127.0.0.1', port), Handler)
    print(f'Lemmata crawler bridge on http://127.0.0.1:{port}; token authentication required.', flush=True)
    server.serve_forever()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8769)
    args = parser.parse_args()
    secret = os.environ.pop('LEMMATA_CRAWL_TOKEN', '')
    if len(secret) < 24: parser.error('Set LEMMATA_CRAWL_TOKEN to a random token of at least 24 characters')
    if not 1024 <= args.port <= 65535: parser.error('Choose an unprivileged port')
    # The public-page browser does not need cloud credentials or bridge authority.
    for name in list(os.environ):
        if re.search(r'(API_KEY|ACCESS_KEY|SECRET|TOKEN|PASSWORD)', name, re.I):
            os.environ.pop(name, None)
    serve(args.port, secret)
