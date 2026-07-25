import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
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
