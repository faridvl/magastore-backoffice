import Document, { Html, Head, Main, NextScript } from 'next/document';

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Brand Favicon */}
          {/* <link rel="icon" type="image/png" sizes="32x32" href="/zynka-logo.png" /> */}
          {/* TODO: Soportar favicon dinámico dark/light */}

          <link rel="manifest" href="/site.webmanifest" />

          {/* Brand Theme Color (alineado a Tailwind background) */}
          <meta name="theme-color" content="#ffffff" />

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
