import type { Metadata } from 'next';
import './globals.css';
import './utilities.css';
import './workspace.css';
import 'katex/dist/katex.min.css';

export const metadata: Metadata = {
  title: 'TeXStudio Local — High-Performance LaTeX Workstation',
  description:
    'Modern, offline-first personal LaTeX workstation with responsive PDF preview, local AI assistant, and multi-engine compilation.',
  icons: {
    icon: '/favicon.svg?v=3',
    shortcut: '/favicon.svg?v=3',
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
        <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="dot-grid-bg text-slate-100 antialiased overflow-hidden select-none">
        {children}
      </body>
    </html>
  );
}
