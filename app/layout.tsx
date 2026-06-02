import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Shared Ledger — Premium Financial Records',
    template: '%s | Shared Ledger',
  },
  description:
    'A premium fintech application for managing shared financial records between trusted parties.',
  keywords: ['ledger', 'finance', 'payments', 'shared ledger', 'fintech'],
  authors: [{ name: 'Shared Ledger' }],
  creator: 'Shared Ledger',
  openGraph: {
    type: 'website',
    title: 'Shared Ledger',
    description: 'Premium shared financial ledger',
    siteName: 'Shared Ledger',
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/apple-touch-icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
