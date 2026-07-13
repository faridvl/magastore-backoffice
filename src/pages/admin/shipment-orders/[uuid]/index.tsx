import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { ShipmentOrderDetailContainer } from '@/components/containers/shipment-orders/shipment-order-detail/shipment-order-detail';

const ShipmentOrderDetailPage: React.FC = () => {
  return (
    <>
      <Head>
        <title>Detalle de Orden de Envío | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Detalle de Orden de Envío">
        <ShipmentOrderDetailContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage();

export default ShipmentOrderDetailPage;
