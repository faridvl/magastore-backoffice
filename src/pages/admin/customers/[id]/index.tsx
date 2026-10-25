import React from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CustomerDetailContainer } from '@/components/containers/customers/customer-detail/customer-detail-container';
import { useCustomerProfile } from '@/shared/api/querys/customers/find-one-customer-query';

const CUSTOMER_FALLBACK_TITLE = 'Cliente';

const CustomerDetailPage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;
    // Misma consulta que usa la ficha: comparten caché, no pide el cliente dos veces.
    const { data: customer } = useCustomerProfile(typeof id === 'string' ? id : undefined);
    const title = customer ? `${customer.first_name} ${customer.last_name}` : CUSTOMER_FALLBACK_TITLE;

    return (
        <>
            <Head><title>{`${title} | Magastore`}</title></Head>
            <DashboardLayout
                isMainPage={false}
                contentStyle={BoxedLayoutStyle.FULL}
                title={title}
            >
                {router.isReady && id ? (
                    <CustomerDetailContainer id={id as string} />
                ) : (
                    <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
                        Cargando...
                    </div>
                )}
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();
export default CustomerDetailPage;