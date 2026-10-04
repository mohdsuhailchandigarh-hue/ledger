import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ServiceWorkerRegister } from '@/components/pwa/ServiceWorkerRegister';
import { OfflineIndicator } from '@/components/pwa/OfflineIndicator';

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
  manifest: '/manifest.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#1F1E24',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Ledger" />
        <meta name="theme-color" content="#1F1E24" />
        <link rel="manifest" href="/manifest.webmanifest" />
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
      <body>
        <ServiceWorkerRegister />
        <OfflineIndicator />
        {children}
      </body>
    </html>
  );
}
