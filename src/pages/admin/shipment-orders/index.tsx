import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { ShipmentOrdersContainer } from '@/components/containers/shipment-orders/shipment-orders-container';

const ShipmentOrdersPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Órdenes de Envío | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Gestión de Órdenes de Envío">
        <ShipmentOrdersContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage();

export default ShipmentOrdersPage;
