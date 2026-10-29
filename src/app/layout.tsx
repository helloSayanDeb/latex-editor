import type { Metadata } from 'next';
import './globals.css';
import './utilities.css';
import './workspace.css';
import './theme.css';
import './premium.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'Lemmata — High-Performance LaTeX Workstation',
  description:
    'Modern, offline-first personal LaTeX workstation with responsive PDF preview, local AI assistant, and multi-engine compilation.',
  icons: {
    icon: '/favicon.svg?v=20261028-amber',
    shortcut: '/favicon.svg?v=20261028-amber',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=20261028-amber" />
      </head>
      <body className="dot-grid-bg text-slate-100 antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
