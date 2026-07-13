import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useShipmentOrderDetailQuery } from '@/shared/api/querys/shipment-orders/use-shipment-order-detail-query';
import { useUpdateShipmentOrderStatusMutation } from '@/shared/api/mutations/shipment-orders/use-update-shipment-order-status-mutation';
import { useUnassignPackageMutation } from '@/shared/api/mutations/shipment-orders/use-unassign-package-mutation';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { ConsolidationStatus, DeliveryMethod } from '@/types/logistics/logistics.types';

export const useShipmentOrderDetail = (uuid?: string) => {
  const router = useRouter();

  const [showPreBillingModal, setShowPreBillingModal] = useState(false);
  const [preBillingDeliveryMethod, setPreBillingDeliveryMethod] = useState<DeliveryMethod>('RETIRO');
  const [isGeneratingPreBilling, setIsGeneratingPreBilling] = useState(false);
  const [isConfirmingPreBilling, setIsConfirmingPreBilling] = useState(false);
  const [quickActionTarget, setQuickActionTarget] = useState<'reopen' | 'dispatch' | null>(null);

  const detailQuery = useShipmentOrderDetailQuery(uuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();
  const detail = detailResponse?.data ?? null;

  const { updateStatus, isPending: isUpdating } = useUpdateShipmentOrderStatusMutation();
  const { unassignPackage, isPending: isUnassigning } = useUnassignPackageMutation();
  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const handleBack = () => router.push('/admin/shipment-orders');

  const handleUnassignPackage = async (packageUuid: string) => {
    try {
      await unassignPackage({ packageUuid });
      await detailQuery.invalidate();
      toast.success('Paquete removido de la orden de envío');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo quitar el paquete de la orden de envío.');
    }
  };

  const handleConfirmQuickAction = async () => {
    if (!quickActionTarget || !detail) return;
    try {
      if (quickActionTarget === 'reopen') {
        await updateStatus({ consolidationUuid: detail.uuid, status: ConsolidationStatus.ABIERTO, currentStatus: ConsolidationStatus.CERRADO });
        toast.success('Orden de envío reabierta');
      } else {
        await updateStatus({ consolidationUuid: detail.uuid, status: ConsolidationStatus.DESPACHADO, currentStatus: ConsolidationStatus.CERRADO });
        toast.success('Orden de envío marcada como despachada');
      }
      setQuickActionTarget(null);
      await detailQuery.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo completar la acción.');
    }
  };

  const handleAdvanceStatus = async () => {
    if (!detail) return;
    const { uuid: consolidationUuid, status } = detail;
    const nextMap: Record<ConsolidationStatus, ConsolidationStatus | null> = {
      [ConsolidationStatus.ABIERTO]: null,
      [ConsolidationStatus.CERRADO]: ConsolidationStatus.DESPACHADO,
      [ConsolidationStatus.DESPACHADO]: ConsolidationStatus.ENTREGADO,
      [ConsolidationStatus.ENTREGADO]: null,
    };
    const next = nextMap[status];
    if (!next) return;
    try {
      await updateStatus({ consolidationUuid, status: next, currentStatus: status });
      // Al despachar la orden de envío, despachar también todos sus paquetes
      if (next === ConsolidationStatus.ENTREGADO) {
        const packageUuids = detail.packages.map((p) => p.uuid);
        if (packageUuids.length > 0) {
          await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=bulk-status', {
            packageUuids,
            status: 'ENTREGADO',
          });
        }
      }
      await detailQuery.invalidate();
      toast.success(`Estado actualizado a ${next}`);
    } catch (err: any) {
      toast.error('No se pudo avanzar el estado de la orden de envío. Intenta de nuevo.');
    }
  };

  const handleGeneratePreBilling = async () => {
    if (!uuid) return;
    setIsGeneratingPreBilling(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=pre-billing', {
        consolidationUuid: uuid,
        deliveryMethod: preBillingDeliveryMethod,
      });
      await detailQuery.invalidate();
      toast.success('Prefactura generada correctamente. La orden de envío pasó a estado Cerrado.');
      setShowPreBillingModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo generar la prefactura. Intenta de nuevo.');
    } finally {
      setIsGeneratingPreBilling(false);
    }
  };

  const handleDownloadPreBillingPDF = async (preBillingUuid: string, customerCode: string) => {
    try {
      const response = await fetch(`/api/billing/pre-billing-pdf?uuid=${preBillingUuid}`);
      if (!response.ok) throw new Error('No se pudo generar el PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimado-${customerCode}-${preBillingUuid.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo.');
    }
  };

  const handleConfirmPreBilling = async () => {
    if (!uuid) return;
    setIsConfirmingPreBilling(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=confirm-pre-billing', {
        consolidationUuid: uuid,
      });
      await detailQuery.invalidate();
      toast.success('Prefactura confirmada y factura generada');
    } catch (err: any) {
      const msg = err?.message || 'No se pudo confirmar la prefactura.';
      toast.error(msg);
    } finally {
      setIsConfirmingPreBilling(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!detail?.billing_uuid) return;
    try {
      await markAsPaid({ billingUuid: detail.billing_uuid });
      await detailQuery.invalidate();
      toast.success('Factura marcada como pagada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo registrar el pago. Intenta de nuevo.');
    }
  };

  return {
    detail,
    isLoadingDetail,
    handleBack,

    handleAdvanceStatus, isUpdating,
    quickActionTarget, setQuickActionTarget,
    handleConfirmQuickAction,

    handleUnassignPackage, isUnassigning,

    showPreBillingModal, setShowPreBillingModal,
    preBillingDeliveryMethod, setPreBillingDeliveryMethod,
    handleGeneratePreBilling,
    isGeneratingPreBilling,
    handleConfirmPreBilling,
    isConfirmingPreBilling,
    handleDownloadPreBillingPDF,

    handleMarkAsPaid, isMarkingPaid,
  };
};
