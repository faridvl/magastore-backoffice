import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { ConsolidationsContainer } from '@/components/containers/consolidations/consolidations-container';

const ConsolidationsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Consolidaciones | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Gestión de Consolidaciones">
        <ConsolidationsContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage();

export default ConsolidationsPage;
