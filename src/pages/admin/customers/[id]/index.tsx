import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CustomerDetailContainer } from '@/components/containers/customers/customer-detail/customer-detail-container';

const CustomerDetailPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;

    return (
        <>
            <Head><title>Detalle de Cliente | Sistema Médico</title></Head>
            <DashboardLayout
                isMainPage={false}
                contentStyle={BoxedLayoutStyle.FULL}
                title="Expediente de Cliente"
            >
                <CustomerDetailContainer id={id as string} />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();
export default CustomerDetailPage;