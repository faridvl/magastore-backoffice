import React, { useState } from 'react';
import { AppProps } from 'next/app';
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

const MyApp: React.FC<AppProps> = ({ Component, pageProps }) => {
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

        {/* Base SEO Identity */}
        <title>Magastore | Courier & Logística</title>
        <meta
          name="description"
          content="Backoffice de Magastore: importación de paquetes, órdenes de envío, facturación y seguimiento de envíos desde Panamá a Costa Rica."
        />

        {/* Open Graph */}
        <meta property="og:title" content="Magastore | Courier & Logística" />
        <meta
          property="og:description"
          content="Backoffice de Magastore: importación de paquetes, órdenes de envío, facturación y seguimiento de envíos desde Panamá a Costa Rica."
        />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:type" content="website" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Magastore | Courier & Logística" />
        <meta
          name="twitter:description"
          content="Backoffice de Magastore: importación de paquetes, órdenes de envío, facturación y seguimiento de envíos desde Panamá a Costa Rica."
        />
        <meta name="twitter:image" content="/og-image.png" />
      </Head>

      {/* 
        TODO:
        - Activar clase "dark" en <html> o <body> desde _document.tsx
        - Asegurar que el layout principal aplique:
          bg-background text-slate-100 min-h-screen font-sans
      */}

      <QueryClientProvider client={queryClient}>
        <NavigationContextProvider>
          <DashboardContextProvider>
            <PageLoadingBar />
            <BannerContainer />
            <Component {...pageProps} />
          </DashboardContextProvider>
        </NavigationContextProvider>

        <ReactQueryDevtools initialIsOpen={false} />
        <Toaster richColors position="top-right" />
      </QueryClientProvider>
    </>
  );
};

export default MyApp;
