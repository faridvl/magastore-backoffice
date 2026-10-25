import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { LogisticsContainer } from '@/components/containers/logistics/logistics-container/logistics-container';

const LogisticsPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Paquetes | Magastore</title>
            </Head>
            <DashboardLayout isMainPage contentStyle={BoxedLayoutStyle.FULL} title="Paquetes">
                <LogisticsContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default LogisticsPage;