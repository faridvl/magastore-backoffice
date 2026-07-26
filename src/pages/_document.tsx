import Document, { Html, Head, Main, NextScript, DocumentContext, DocumentInitialProps } from 'next/document';

const APPLE_SPLASH_SIZES: Array<{ width: number; height: number; dpr: number }> = [
  { width: 1170, height: 2532, dpr: 3 },
  { width: 1179, height: 2556, dpr: 3 },
  { width: 1284, height: 2778, dpr: 3 },
  { width: 1290, height: 2796, dpr: 3 },
  { width: 1125, height: 2436, dpr: 3 },
  { width: 828, height: 1792, dpr: 2 },
  { width: 750, height: 1334, dpr: 2 },
  { width: 1668, height: 2388, dpr: 2 },
  { width: 2048, height: 2732, dpr: 2 },
  { width: 1620, height: 2160, dpr: 2 },
  { width: 1640, height: 2360, dpr: 2 },
];

interface MyDocumentProps extends DocumentInitialProps {
  splashVariant: 'green' | 'black';
}

class MyDocument extends Document<MyDocumentProps> {
  static async getInitialProps(ctx: DocumentContext): Promise<MyDocumentProps> {
    const initialProps = await Document.getInitialProps(ctx);
    const host = ctx.req?.headers.host ?? '';
    const splashVariant = host.includes('dev-portal') ? 'green' : 'black';
    return { ...initialProps, splashVariant };
  }

  render() {
    const { splashVariant } = this.props;

    return (
      <Html>
        <Head>
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no"
          />
          <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
          <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />

          <link rel="manifest" href="/api/site.webmanifest" />

          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />

          {APPLE_SPLASH_SIZES.map(({ width, height, dpr }) => (
            <link
              key={`${width}x${height}-portrait`}
              rel="apple-touch-startup-image"
              href={`/splash/${splashVariant}-${width}x${height}.png`}
              media={`(device-width: ${width / dpr}px) and (device-height: ${height / dpr}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`}
            />
          ))}

          {/* Brand Theme Color (alineado a paleta Magastore) */}
          <meta name="theme-color" content="#111111" />

          {/* Preconnect para performance si usas Google Fonts */}
          {/* <link rel="preconnect" href="https://fonts.googleapis.com" /> */}
          {/* <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" /> */}

          {/* TODO: Si usas Poppins/Inter desde Google, cargarlas aquí */}
        </Head>

        <body className=" font-sans antialiased">
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

export default MyDocument;
