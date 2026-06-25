import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { BillingContainer } from '@/components/containers/billing/billing-container';

const BillingPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Cobros | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Gestión de Cobros">
        <BillingContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage();

export default BillingPage;
