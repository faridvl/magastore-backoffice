import { useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useShipmentOrderDetailQuery } from '@/shared/api/querys/shipment-orders/use-shipment-order-detail-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useUpdateShipmentOrderStatusMutation } from '@/shared/api/mutations/shipment-orders/use-update-shipment-order-status-mutation';
import { useUnassignPackageMutation } from '@/shared/api/mutations/shipment-orders/use-unassign-package-mutation';
import { useAssignPackagesToOrderMutation } from '@/shared/api/mutations/shipment-orders/use-assign-packages-to-order-mutation';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { downloadPdf } from '@/shared/utils/download-pdf';
import { notifyWhatsApp, buildPreBillingReadyMessage } from '@/shared/constants/whatsapp-templates';
import { useWhatsAppTemplateBody } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { WHATSAPP_TEMPLATE_CODES } from '@/shared/constants/whatsapp-template-vars';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { ConsolidationStatus, DeliveryMethod, AvailablePackage } from '@/types/logistics/logistics.types';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';
import { CustomerAddress } from '@/types/customer/customer.types';

export const useShipmentOrderDetail = (uuid?: string) => {
  const router = useRouter();

  const [showPreBillingModal, setShowPreBillingModal] = useState(false);
  // Fallback solo para órdenes viejas sin delivery_method guardado — con una
  // orden nueva este valor no se usa, generatePreBilling lee el de la orden.
  const [preBillingDeliveryMethod, setPreBillingDeliveryMethod] = useState<DeliveryMethod>('RETIRO');
  const [isGeneratingPreBilling, setIsGeneratingPreBilling] = useState(false);
  const [isConfirmingPreBilling, setIsConfirmingPreBilling] = useState(false);
  const [quickActionTarget, setQuickActionTarget] = useState<'reopen' | 'dispatch' | null>(null);

  const [showAddressModal, setShowAddressModal] = useState(false);
  const [addressOptions, setAddressOptions] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);

  const [showMethodModal, setShowMethodModal] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null);
  const [isSavingMethod, setIsSavingMethod] = useState(false);

  const [showAssignModal, setShowAssignModal] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<AvailablePackage[]>([]);
  const [selectedPackageUuids, setSelectedPackageUuids] = useState<string[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);

  const [isNotifyingPreBilling, setIsNotifyingPreBilling] = useState(false);
  const preBillingTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.PREBILLING_READY);

  const [showBillingModal, setShowBillingModal] = useState(false);
  const [isDownloadingBillingPdf, setIsDownloadingBillingPdf] = useState(false);

  const detailQuery = useShipmentOrderDetailQuery(uuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();
  const detail = detailResponse?.data ?? null;
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();

  // Detalle de la factura para el modal — solo se consulta al abrirlo
  const billingDetailQuery = useBillingDetailQuery(detail?.billing_uuid ?? '');
  const { data: billingDetailResponse, isLoading: isLoadingBillingDetail } = billingDetailQuery.useQuery({
    enabled: showBillingModal && !!detail?.billing_uuid,
  });
  const billingDetail = billingDetailResponse?.data ?? null;

  const { updateStatus, isPending: isUpdating } = useUpdateShipmentOrderStatusMutation();
  const { unassignPackage, isPending: isUnassigning } = useUnassignPackageMutation();
  const { assignPackagesToOrder, isPending: isAssigning } = useAssignPackagesToOrderMutation();
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
        // La orden ya trae su método elegido al crearla; solo se manda explícito
        // como fallback si es una orden vieja sin delivery_method guardado.
        deliveryMethod: detail?.delivery_method ?? preBillingDeliveryMethod,
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
      await downloadPdf(
        `/api/billing/pre-billing-pdf?uuid=${preBillingUuid}`,
        `PREFACTURA-${customerCode}-${preBillingUuid.slice(-8).toUpperCase()}.pdf`,
      );
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
      await Promise.all([detailQuery.invalidate(), billingDetailQuery.invalidate()]);
      setShowBillingModal(false);
      toast.success('Factura marcada como pagada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo registrar el pago. Intenta de nuevo.');
    }
  };

  const handleDownloadBillingPdf = async (billingUuid: string, invoiceNumber?: number) => {
    setIsDownloadingBillingPdf(true);
    try {
      const label = invoiceNumber != null ? `F-${String(invoiceNumber).padStart(4, '0')}` : billingUuid.slice(-8).toUpperCase();
      await downloadPdf(`/api/billing/pdf?uuid=${billingUuid}`, `FACTURA-${label}.pdf`);
    } catch {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo más tarde.');
    } finally {
      setIsDownloadingBillingPdf(false);
    }
  };

  const handleOpenAddressModal = async () => {
    if (!detail) return;
    setIsLoadingAddresses(true);
    try {
      const { data: addresses } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: CustomerAddress[] }>(`/customers/${detail.customer_id}/addresses`);
      setAddressOptions(addresses);
      setSelectedAddressId(detail.delivery_address_id ?? addresses.find((a: CustomerAddress) => a.is_default)?.id ?? '');
      setShowAddressModal(true);
    } catch {
      toast.error('No se pudieron cargar las direcciones del cliente.');
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleConfirmAddressChange = async () => {
    if (!uuid || !selectedAddressId) return;
    setIsSavingAddress(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'set-delivery-address',
        consolidationUuid: uuid,
        addressId: selectedAddressId,
      });
      await detailQuery.invalidate();
      toast.success('Dirección de entrega actualizada');
      setShowAddressModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar la dirección de entrega.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleOpenMethodModal = () => {
    if (!detail) return;
    setSelectedMethod(detail.delivery_method);
    setShowMethodModal(true);
  };

  const handleConfirmMethodChange = async () => {
    if (!uuid || !selectedMethod) return;
    setIsSavingMethod(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'set-delivery-method',
        consolidationUuid: uuid,
        deliveryMethod: selectedMethod,
      });
      await detailQuery.invalidate();
      toast.success('Método de envío actualizado');
      setShowMethodModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar el método de envío.');
    } finally {
      setIsSavingMethod(false);
    }
  };

  const handleOpenAssignModal = async () => {
    if (!detail) return;
    setSelectedPackageUuids([]);
    setIsLoadingAvailable(true);
    try {
      const { data: packages } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: AvailablePackage[] }>(`/consolidations?availablePackages=${detail.customer_id}`);
      setAvailablePackages(packages);
      setShowAssignModal(true);
    } catch {
      toast.error('No se pudieron cargar los paquetes disponibles del cliente.');
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleTogglePackage = (packageUuid: string) => {
    setSelectedPackageUuids((prev) =>
      prev.includes(packageUuid) ? prev.filter((u) => u !== packageUuid) : [...prev, packageUuid],
    );
  };

  const handleConfirmAssign = async () => {
    if (!uuid || selectedPackageUuids.length === 0) return;
    try {
      await assignPackagesToOrder({ consolidationUuid: uuid, packageUuids: selectedPackageUuids });
      await detailQuery.invalidate();
      toast.success('Paquetes agregados a la orden de envío');
      setShowAssignModal(false);
      setSelectedPackageUuids([]);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudieron agregar los paquetes.');
    }
  };

  const handleNotifyPreBilling = async () => {
    if (!uuid || !detail) return;
    if (!detail.customer_phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setIsNotifyingPreBilling(true);
    try {
      const packages = detail.packages ?? [];
      // Mismo desglose que imprime el PDF del estimado: se reusa el helper para
      // que el mensaje de WhatsApp y el PDF nunca muestren cifras distintas del
      // mismo estimado. El subtotal por paquete es un prorrateo del flete por
      // peso — la orden se cobra por peso agregado, no paquete por paquete.
      const deliveryFeeCrc = Number(detail.pre_billing_fee_crc ?? 0);
      const breakdown = buildBillingBreakdown({
        packages: packages.map((p) => ({
          tracking_number: p.tracking_number,
          weight_lb: p.weight_lb,
        })),
        amountCrc: detail.pre_billing_amount ?? 0,
        deliveryFeeCrc,
        totalWeightCharged: detail.total_weight_lb,
        appliedRateUsd: detail.pre_billing_rate_usd ?? detail.current_price_per_lb,
        appliedExchange: detail.pre_billing_exchange ?? detail.current_exchange_rate,
        billingMode: detail.customer_type_billing_mode,
        discountPercent: detail.customer_type_discount_percent,
      });

      const packageLines = packages.map((p, i) => ({
        storeName: p.store_name,
        trackingNumber: p.tracking_number,
        weightLb: Number(p.weight_lb),
        amountCrc: breakdown.lines[i]?.subtotal ?? null,
      }));

      const message = buildPreBillingReadyMessage({
        firstName: detail.customer_name.split(' ')[0] || detail.customer_name,
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        weightLb: Number(detail.total_weight_lb),
        deliveryMethodLabel: resolveDeliveryMethodLabel(detail.pre_billing_delivery_method, deliveryMethodsData?.data) || null,
        amountCrc: detail.pre_billing_amount,
        shippingCrc: breakdown.flete,
        deliveryFeeCrc,
        discountCrc: breakdown.descuento,
        discountLabel: breakdown.ruleLabel,
        packages: packageLines,
        templateBody: preBillingTemplateBody,
      });
      // notified_at se estampa ANTES de notificar: fuera de iPad se navega a
      // WhatsApp en la misma vista y nada de lo que quede después se ejecuta.
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'notify-pre-billing',
        consolidationUuid: uuid,
      });
      await detailQuery.invalidate();

      await notifyWhatsApp(detail.customer_phone, message);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo registrar la notificación.');
    } finally {
      setIsNotifyingPreBilling(false);
    }
  };

  // La orden ya trae su método elegido desde que se creó. El modal de "Generar
  // Estimado" solo aparece como fallback si es una orden vieja sin delivery_method.
  const handleGenerateEstimateClick = () => {
    if (detail?.delivery_method) {
      handleGeneratePreBilling();
    } else {
      setShowPreBillingModal(true);
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
    handleGenerateEstimateClick,
    isGeneratingPreBilling,
    handleConfirmPreBilling,
    isConfirmingPreBilling,
    handleDownloadPreBillingPDF,

    handleMarkAsPaid, isMarkingPaid,

    showBillingModal, setShowBillingModal,
    billingDetail, isLoadingBillingDetail,
    handleDownloadBillingPdf, isDownloadingBillingPdf,

    showAddressModal, setShowAddressModal,
    addressOptions,
    selectedAddressId, setSelectedAddressId,
    isLoadingAddresses,
    handleOpenAddressModal,
    handleConfirmAddressChange,

    showMethodModal, setShowMethodModal,
    selectedMethod, setSelectedMethod,
    isSavingMethod,
    handleOpenMethodModal,
    handleConfirmMethodChange,
    isSavingAddress,

    showAssignModal, setShowAssignModal,
    availablePackages,
    isLoadingAvailable,
    selectedPackageUuids,
    handleOpenAssignModal,
    handleTogglePackage,
    handleConfirmAssign,
    isAssigning,

    handleNotifyPreBilling,
    isNotifyingPreBilling,
  };
};
