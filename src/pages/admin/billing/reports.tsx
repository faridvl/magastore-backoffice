import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { BillingReportsContainer } from '@/components/containers/billing/billing-reports-container';

const BillingReportsPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Reportes de Facturación | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Reportes de Facturación">
        <BillingReportsContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default BillingReportsPage;
