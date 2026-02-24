import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CustomersContainer } from '@/components/containers/customers/list-customers/customers-container';

const CustomersPage: React.FC = () => {
    return (
        <>
            <Head>
                <title>Clientes | Sistema Médico</title>
            </Head>
            <DashboardLayout
                isMainPage
                contentStyle={BoxedLayoutStyle.FULL}
                title="Directorio de Clientes"
            >
                <CustomersContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default CustomersPage;