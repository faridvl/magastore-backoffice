import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { WhatsAppTemplatesContainer } from '@/components/containers/whatsapp-templates/whatsapp-templates-container';

const WhatsAppTemplatesPage: React.FC = () => {
    return (
        <>
            <Head><title>Plantillas de WhatsApp | Magastore</title></Head>
            <DashboardLayout
                contentStyle={BoxedLayoutStyle.FULL}
                title="Plantillas de WhatsApp"
            >
                <WhatsAppTemplatesContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default WhatsAppTemplatesPage;
