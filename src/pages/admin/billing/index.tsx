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
        <title>Facturación | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Facturación">
        <BillingContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default BillingPage;
