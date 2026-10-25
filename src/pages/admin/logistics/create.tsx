import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { CreatePackageContainer } from '@/components/containers/logistics/create-package-container';

const CreatePackagePage: React.FC = () => {
    return (
        <>
            <Head><title>Registrar paquete | Magastore</title></Head>
            <DashboardLayout
                isMainPage={false}
                contentStyle={BoxedLayoutStyle.FULL}
                title="Registrar paquete"
            >
                <CreatePackageContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();
export default CreatePackagePage;