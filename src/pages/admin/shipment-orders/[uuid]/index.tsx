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
        <title>Orden de envío | Magastore</title>
      </Head>
      <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Orden de envío">
        <ShipmentOrderDetailContainer />
      </DashboardLayout>
    </>
  );
};

export const getServerSideProps = authorizeServerSidePage();

export default ShipmentOrderDetailPage;
