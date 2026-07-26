import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { WhatsAppTemplateDetailContainer } from '@/components/containers/whatsapp-templates/whatsapp-template-detail/whatsapp-template-detail';

const WhatsAppTemplateDetailPage: React.FC = () => {
    return (
        <>
            <Head><title>Editar Plantilla | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Editar Plantilla">
                <WhatsAppTemplateDetailContainer />
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default WhatsAppTemplateDetailPage;
