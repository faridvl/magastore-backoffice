import React from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { OperationsContainer } from '@/components/containers/operations/operations-container';
import { authorizeServerSidePage } from '@/hocs/auth';

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

const OperationsPage: React.FC = () => {
  return (
    <>
      <Head><title>Operativo | Magastore</title></Head>
      <DashboardLayout isMainPage contentStyle={BoxedLayoutStyle.FULL} title="Operativo">
        <OperationsContainer />
      </DashboardLayout>
    </>
  );
};

export default OperationsPage;
