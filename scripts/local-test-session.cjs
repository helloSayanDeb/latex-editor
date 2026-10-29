require('node:fs').mkdirSync(require('node:path').resolve(__dirname,'..','tmp'), { recursive: true });
// CLI regression checks bootstrap the same local session as a browser navigation.
// No secret is saved to disk or printed; unrelated provider requests are untouched.
const original = global.fetch;
const sessions = new Map();
global.fetch = async (input, options = {}) => {
  const url = new URL(typeof input === 'string' ? input : input.url || String(input));
  if (['localhost', '127.0.0.1'].includes(url.hostname) && url.port === (process.env.LEMMATA_PORT || (process.env.LEMMATA_TEST_URL ? new URL(process.env.LEMMATA_TEST_URL).port : '2303')) && url.pathname.startsWith('/api/')) {
    if (!sessions.has(url.origin)) sessions.set(url.origin, (async () => {
      const page = await original(url.origin + '/');
      await page.body?.cancel();
      const cookie = page.headers.get('set-cookie')?.match(/lemmata_session=[a-f0-9]{64}/)?.[0];
      if (!cookie) throw new Error('Start the protected workstation with npm run dev or npm start before live checks.');
      return cookie;
    })());
    const headers = new Headers(options.headers);
    headers.set('cookie', await sessions.get(url.origin));
    return original(input, { ...options, headers });
  }
  return original(input, options);
};
