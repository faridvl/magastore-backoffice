import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { PackageDetailContainer } from '@/components/containers/logistics/logistics-view-detail/logistics-view-detail';

const PackageDetailPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Detalle de Paquete | Sistema Médico</title>
            </Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Detalle del Paquete"
            >
                <PackageDetailContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default PackageDetailPage;