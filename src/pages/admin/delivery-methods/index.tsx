import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { DeliveryMethodsContainer } from '@/components/containers/delivery-methods/delivery-methods-container';

const DeliveryMethodsPage: React.FC = () => {
    return (
        <>
            <Head><title>Métodos de Entrega | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Métodos de Entrega"
            >
                <DeliveryMethodsContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default DeliveryMethodsPage;
