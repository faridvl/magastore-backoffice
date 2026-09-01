import React, { useState } from 'react';
import { AppProps } from 'next/app';
import { useRouter } from 'next/router';
import Head from 'next/head';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import '../styles/globals.scss';
import '@/shared/i18n/i18n';
import { DashboardContextProvider } from '@/layouts/dashboard/dashboard-context';
import { NavigationContextProvider } from '@/shared/context/navigation-context';
import { PageLoadingBar } from '@/components/common/page-loading-bar/page-loading-bar';
import { BannerContainer } from '@/components/common/banner-container/banner-container';
import { SplashScreen } from '@/components/common/splash-screen/splash-screen';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://magastorecr.com';
const SEO_TITLE = 'Magastore | Compras por Internet';
const SEO_DESCRIPTION =
  'Tu casillero para comprar en el exterior y recibir en Costa Rica: tarifas claras por libra, seguimiento de tus paquetes y entrega a todo el país.';

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
  const isLanding = useRouter().pathname === '/landing';
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <>
      <Head>
        {/* Brand Theme Color (alineado a paleta Magastore) */}
        <meta name="theme-color" content="#111111" />

        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />

        {/* PWA: instalable en pantalla de inicio (iOS + Android) */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Magastore" />

        {/* Base SEO Identity.
            Estas etiquetas aplican a todo el sitio, incluidas las páginas
            públicas, así que el texto es el de cara al cliente: no menciona la
            operación interna. Las páginas públicas las sobreescriben con su
            propio <Head>. */}
        <title>{SEO_TITLE}</title>
        <meta name="description" content={SEO_DESCRIPTION} />

        {/* Open Graph. og:image debe ser URL absoluta o los scrapers de
            WhatsApp/Facebook no la resuelven. */}
        <meta property="og:title" content={SEO_TITLE} />
        <meta property="og:description" content={SEO_DESCRIPTION} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Magastore" />
        <meta property="og:locale" content="es_CR" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={SEO_TITLE} />
        <meta name="twitter:description" content={SEO_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/og-image.png`} />
      </Head>

      {/* 
        TODO:
        - Activar clase "dark" en <html> o <body> desde _document.tsx
        - Asegurar que el layout principal aplique:
          bg-background text-slate-100 min-h-screen font-sans
      */}

      <SplashScreen />

      <QueryClientProvider client={queryClient}>
        <NavigationContextProvider>
          <DashboardContextProvider>
            <PageLoadingBar />
            <BannerContainer />
            <Component {...pageProps} />
          </DashboardContextProvider>
        </NavigationContextProvider>

        {/* El landing es una página pública sin React Query; su botón flotante
            se solapaba con el FAB de WhatsApp en la misma esquina. */}
        {!isLanding && <ReactQueryDevtools initialIsOpen={false} />}
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </>
  );
};

export default MyApp;
