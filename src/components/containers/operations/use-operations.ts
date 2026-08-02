import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useOperationsQuery } from '@/shared/api/querys/dashboard/use-operations-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
import { useNotifyMultipleCustomers } from '@/hooks/use-notify-multiple-customers';
import { downloadPdf } from '@/shared/utils/download-pdf';
import { OperationsStats } from '@/types/dashboard/operations.types';
import { routesPrivate } from '@/shared/navigation/routes';

const EMPTY_STATS: OperationsStats = {
  inbox: {
    packagesWithoutCost: 0,
    packagesWithoutOrder: 0,
    customersWithPackagesWithoutOrder: 0,
    packagesNotNotified: 0,
    customersWithPackagesNotNotified: 0,
    ordersNotNotified: 0,
    ordersPendingPayment: 0,
    pendingPaymentCRC: 0,
  },
  pendingReceivables: [],
  pendingReceivablesTotal: 0,
  awaitingNotification: [],
  awaitingNotificationTotal: 0,
  monthly: {
    invoicedCRC: 0,
    paidCRC: 0,
    profitCRC: 0,
    unknownCostCount: 0,
    packageCount: 0,
    packageCountPreviousMonth: 0,
  },
  revenueByMonth: [],
};

export function useOperations() {
  const router = useRouter();
  const operationsQuery = useOperationsQuery();
  const { data, isLoading, isError } = operationsQuery.useQuery();

  const stats: OperationsStats = data?.data ?? EMPTY_STATS;

  // --- Factura: se abre el mismo modal de detalle que usa la pantalla de
  // Facturación, con su desglose, PDF y "Marcar como Pagado". No se replica el
  // botón de pago en la tabla: el operador confirma sobre el detalle completo.
  const [selectedBillingUuid, setSelectedBillingUuid] = useState<string | null>(null);
  const detailQuery = useBillingDetailQuery(selectedBillingUuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();
  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const handleMarkAsPaid = async () => {
    if (!selectedBillingUuid) return;
    try {
      await markAsPaid({ billingUuid: selectedBillingUuid });
      await detailQuery.invalidate();
      await operationsQuery.invalidate();
      setSelectedBillingUuid(null);
      toast.success('Factura marcada como pagada');
    } catch {
      toast.error('No se pudo registrar el pago. Intenta de nuevo.');
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async (uuid: string, invoiceNumber?: number) => {
    setIsDownloadingPdf(true);
    try {
      const label = invoiceNumber != null
        ? `F-${String(invoiceNumber).padStart(4, '0')}`
        : uuid.slice(-8).toUpperCase();
      await downloadPdf(`/api/billing/pdf?uuid=${uuid}`, `FACTURA-${label}.pdf`);
    } catch {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo más tarde.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // --- Aviso de "paquetes disponibles": el mismo modal de Logística, con un
  // botón de WhatsApp por cliente. Al cerrarlo se refresca el panel para que los
  // clientes ya notificados salgan de la bandeja.
  const notifyMultiple = useNotifyMultipleCustomers();

  const closeNotifyModal = async () => {
    notifyMultiple.close();
    await operationsQuery.invalidate();
  };

  /**
   * El aviso de cobro se arma con el desglose por paquete, las tarifas aplicadas
   * y el descuento del tipo de cliente. Esa lógica vive en el detalle de la orden
   * y no se duplica acá: se navega para que el mensaje salga de una sola fuente.
   */
  const goToOrder = (consolidationUuid: string) => {
    router.push(`${routesPrivate.admin.shipmentOrders.index}/${consolidationUuid}`);
  };

  return {
    stats,
    isLoading,
    isError,
    goToOrder,

    // Modal de factura
    selectedBillingUuid,
    setSelectedBillingUuid,
    billingDetail: detailResponse?.data ?? null,
    isLoadingDetail,
    handleMarkAsPaid,
    isMarkingPaid,
    handleDownloadPdf,
    isDownloadingPdf,

    // Modal de notificación de paquetes disponibles
    notifyMultiple,
    closeNotifyModal,
  };
}
