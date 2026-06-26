import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { PackagesContainer } from '@/components/containers/packages/packages-container';

const AdminPackagesPage: React.FC = () => {
    return (
        <>
            <Head><title>Buscador de Paquetes | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Buscador Logístico">
                <PackagesContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default AdminPackagesPage;
