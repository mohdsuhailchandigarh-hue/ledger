import type { Metadata, Viewport } from 'next';
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

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#060608',
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
        <meta name="theme-color" content="#060608" />
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
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if (typeof window !== 'undefined' && 'standalone' in window.navigator && window.navigator.standalone) {
                document.addEventListener('click', function(e) {
                  var node = e.target;
                  while (node && node.nodeName !== 'A') {
                    node = node.parentNode;
                  }
                  if (node && node.nodeName === 'A' && node.getAttribute('href') && !node.getAttribute('target')) {
                    var href = node.getAttribute('href');
                    if (href.indexOf('http') !== 0 || href.indexOf(window.location.host) !== -1) {
                      e.preventDefault();
                    }
                  }
                }, false);
              }
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
