import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CustomerTypesContainer } from '@/components/containers/customer-types/customer-types-container';

const CustomerTypesPage: React.FC = () => {
    return (
        <>
            <Head><title>Tipos de Cliente | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Tipos de Cliente"
            >
                <CustomerTypesContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default CustomerTypesPage;
