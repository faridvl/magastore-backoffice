import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { SettingsContainer } from '@/components/containers/settings-container/settings-container';

const SettingsPage: React.FC = () => {
    return (
        <>
            <Head><title>Configuración | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Configuración del Sistema"
            >
                <SettingsContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default SettingsPage;