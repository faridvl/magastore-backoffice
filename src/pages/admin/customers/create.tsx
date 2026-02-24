import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CreateCustomerContainer } from '@/components/containers/customers/create-customer/create-customer-container';

const CreateCustomerPage: React.FC = () => {
    return (
        <>
            <Head><title>Nuevo Cliente | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Crear Nuevo Cliente"
            >
                <CreateCustomerContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default CreateCustomerPage;