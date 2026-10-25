import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { SettingsContainer } from '@/components/containers/settings-container/settings-container';

const SettingsPage: React.FC = () => {
    return (
        <>
            <Head><title>Tarifas | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Tarifas"
            >
                <SettingsContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default SettingsPage;