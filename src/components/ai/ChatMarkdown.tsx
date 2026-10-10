'use client';

import React, { memo } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';
import rehypeKatex from 'rehype-katex';
import { useAppDialog } from '@/components/AppDialog';

// Normalize common model-generated TeX delimiters only outside fenced/inline code.
export function normalizeChatMath(text: string) {
  return text.split(/(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`)/g).map((part, index) =>
    index % 2 ? part : part
      .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `\n$$\n${math}\n$$\n`)
      .replace(/\\\((.*?)\\\)/g, (_, math) => `$${math}$`)
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => `\n$$\n${math.trim()}\n$$\n`),
  ).join('');
}

export const ChatMarkdown = memo(function ChatMarkdown({ content }: { content: string }) {
  const { ask, dialog } = useAppDialog();
  return <div className="chat-markdown">
    <Markdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, {
        ...defaultSchema,
        tagNames: [...(defaultSchema.tagNames || []), 'u'],
        attributes: { ...defaultSchema.attributes, code: [['className', /^language-./, 'math-inline', 'math-display']] },
      }], [rehypeKatex, { strict: false, throwOnError: false, trust: false }]]}
      components={{
        // Images from generated messages must not make unsolicited network requests.
        img: ({ alt }) => <span className="chat-image-description">{alt || 'Image'}</span>,
        // A button prevents middle-click, drag or context-menu navigation bypassing confirmation.
        a: ({ children, href }) => !href || !/^https?:\/\//i.test(href) ? <span>{children}</span> : <button type="button" className="chat-reference-link" title={href} onClick={async () => {
          const confirmed = await ask({ title: 'Open external reference?', message: `This link was suggested by AI. Its address or query may contain shared text. Check the complete destination before opening:\n\n${href}`, confirmLabel: 'Open link' });
          if (confirmed) window.open(href, '_blank', 'noopener,noreferrer');
        }}>{children}</button>,
      }}
    >{normalizeChatMath(content)}</Markdown>
    {dialog}
  </div>;
});
