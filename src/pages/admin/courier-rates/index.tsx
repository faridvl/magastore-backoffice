import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CourierRatesContainer } from '@/components/containers/courier-rates/courier-rates-container';

const CourierRatesPage: React.FC = () => {
    return (
        <>
            <Head><title>Tarifas de Courier | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Tarifas de Courier"
            >
                <CourierRatesContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default CourierRatesPage;
