import { Html, Head, Main, NextScript } from 'next/document';

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/favicon.ico" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />

        {/* iOS PWA — makes "Add to Home Screen" work like a native app */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Mailair" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

        {/* Android PWA */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="Mailair" />

        {/* Splash screen colors */}
        <meta name="msapplication-TileColor" content="#0f172a" />
        <meta name="msapplication-TileImage" content="/icon-192.png" />

        <meta name="description" content="Mailair — AI-powered email management. Prioritise, summarise and reply intelligently." />

        <script async src="https://www.googletagmanager.com/gtag/js?id=G-KZRMDX3JN0" />
        <script dangerouslySetInnerHTML={{ __html: `
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-KZRMDX3JN0');
        `}} />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
