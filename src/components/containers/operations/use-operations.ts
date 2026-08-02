import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useOperationsQuery } from '@/shared/api/querys/dashboard/use-operations-query';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
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
  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const stats: OperationsStats = data?.data ?? EMPTY_STATS;

  /**
   * Marca la factura como pagada y refresca el panel: la fila desaparece de la
   * bandeja porque la consulta solo trae `is_paid = false`.
   */
  const markReceivablePaid = async (billingUuid: string) => {
    try {
      await markAsPaid({ billingUuid });
      await operationsQuery.invalidate();
      toast.success('Factura marcada como pagada.');
    } catch {
      toast.error('No se pudo marcar la factura como pagada. Intenta de nuevo.');
    }
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
    markReceivablePaid,
    isMarkingPaid,
    goToOrder,
  };
}
