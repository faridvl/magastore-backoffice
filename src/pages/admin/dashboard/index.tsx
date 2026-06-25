import React from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { DashboardContainer } from '@/components/containers/dashboard/dashboard-container';
import { authorizeServerSidePage } from '@/hocs/auth';

export const getServerSideProps = authorizeServerSidePage();

const DashboardPage: React.FC = () => {
  return (
    <>
      <Head><title>Panel de Control | Magastore</title></Head>
      <DashboardLayout isMainPage contentStyle={BoxedLayoutStyle.FULL} title="Inicio">
        <DashboardContainer />
      </DashboardLayout>
    </>
  );
};

export default DashboardPage;
