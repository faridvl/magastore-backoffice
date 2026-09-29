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
import {
  notifyWhatsApp,
  copyWhatsAppMessage,
  buildPreBillingReadyMessage,
  buildShipmentRequestMessage,
  buildShipmentRequestedCustomerMessage,
  buildShipmentDispatchedMessage,
  buildAddressConfirmationMessage,
  buildAddressRequestMessage,
} from '@/shared/constants/whatsapp-templates';
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
  // 'dispatch' se quitó del tipo: esa rama (modal de confirmación del paso
  // 2→3) se eliminó, la transición ahora es directa (handleAdvanceToDispatchDirect).
  const [quickActionTarget, setQuickActionTarget] = useState<'reopen' | null>(null);

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
  const shipmentRequestTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.SHIPMENT_REQUEST);
  const shipmentRequestedCustomerTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.SHIPMENT_REQUESTED_CUSTOMER);
  const addressConfirmationTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.ADDRESS_CONFIRMATION);
  const addressRequestTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.ADDRESS_REQUEST);
  const shipmentDispatchedTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.SHIPMENT_DISPATCHED);

  // dispatchTrackingCode se quitó: el input de guía en el modal del paso 2→3
  // desapareció junto con ese modal — cargarla vive ahora únicamente en el
  // timeline del paso 3 (handleOpenTrackingModal/trackingDraft, más abajo),
  // que además bloquea su Siguiente hasta tenerla.
  const [showTrackingModal, setShowTrackingModal] = useState(false);
  const [trackingDraft, setTrackingDraft] = useState('');
  const [isSavingTracking, setIsSavingTracking] = useState(false);
  const [isCopyingRequest, setIsCopyingRequest] = useState(false);
  const [isCopyingAddressConfirmation, setIsCopyingAddressConfirmation] = useState(false);
  const [isCopyingAddressRequest, setIsCopyingAddressRequest] = useState(false);

  /**
   * Datos de quien recibe, para la solicitud al proveedor. Se prellenan con los
   * del cliente y el operador los sobrescribe cuando el envío va a un tercero,
   * que es un caso frecuente y hasta ahora obligaba a corregir el mensaje a mano
   * después de pegarlo.
   *
   * Viven solo en el modal: no se guardan. Persistirlos exige columnas de
   * receptor en customer_addresses y es una etapa aparte.
   */
  const [showShipmentRequestModal, setShowShipmentRequestModal] = useState(false);
  const [receiverName, setReceiverName] = useState('');
  const [receiverPhone, setReceiverPhone] = useState('');
  const [receiverIdCard, setReceiverIdCard] = useState('');
  const [isNotifyingDispatch, setIsNotifyingDispatch] = useState(false);
  // Aviso al cliente de que su envío fue solicitado (paso 3, sin guía todavía)
  // — distinto de isNotifyingDispatch, que es el aviso del paso 4 con guía.
  const [isNotifyingShipmentRequested, setIsNotifyingShipmentRequested] = useState(false);
  // Aviso al intentar editar dirección/método con el estimado ya generado: el
  // cambio exige reabrir la orden, no se aplica en silencio.
  const [lockedEditTarget, setLockedEditTarget] = useState<'address' | 'method' | null>(null);

  const [showBillingModal, setShowBillingModal] = useState(false);
  const [isDownloadingBillingPdf, setIsDownloadingBillingPdf] = useState(false);

  // Modal del salto paso 2 (cobro) → paso 3 (despacho): pregunta si la orden
  // ya está pagada, pero NO bloquea el avance — hay clientes (pocos) a los que
  // se les despacha sin haber pagado, caso confirmado por el dueño. Si
  // responde "sí", marca la factura pagada (markAsPaid) antes de despachar; si
  // responde "no", despacha igual y la orden queda visible en el filtro "Sin
  // pagar" del listado.
  const [showPaymentCheckModal, setShowPaymentCheckModal] = useState(false);
  const [isAdvancingToDispatch, setIsAdvancingToDispatch] = useState(false);

  // Paso 4 (Notificación y cierre): ajuste del costo real de envío. Opcional
  // — igual que la guía de rastreo, se puede completar después. actualFeeDraft
  // arranca vacío (no con el fee facturado) para no sugerir un valor que el
  // operador podría confirmar sin fijarse.
  const [showActualFeeModal, setShowActualFeeModal] = useState(false);
  const [actualFeeDraft, setActualFeeDraft] = useState('');
  const [isSavingActualFee, setIsSavingActualFee] = useState(false);
  const [isMarkingChangeReturned, setIsMarkingChangeReturned] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

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

  /**
   * "Atrás" del paso 2 — vuelve al paso 1 sin pasar por el modal de
   * confirmación que ya usa "Volver a abrir" del header. Pedido explícito del
   * dueño: en la card del paso, Siguiente y Atrás conviven, y Atrás ejecuta
   * la reapertura directo, sin mostrar el texto "Volver a abrir" ni pedir
   * confirmación aparte — la propia etiqueta "Atrás" ya deja claro qué hace.
   *
   * Misma transición ABIERTO/CERRADO que ya hacía handleConfirmQuickAction
   * con quickActionTarget==='reopen': el backend borra el estimado (y la
   * factura sin pagar, si existía) al reabrir. El botón solo se muestra si
   * !isPaid — ver wizard-steps-section.tsx.
   */
  const handleGoBackToConfirmation = async () => {
    if (!detail) return;
    try {
      await updateStatus({ consolidationUuid: detail.uuid, status: ConsolidationStatus.ABIERTO, currentStatus: ConsolidationStatus.CERRADO });
      toast.success('Orden de envío devuelta al paso de confirmación');
      await detailQuery.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo volver al paso anterior.');
    }
  };

  /**
   * Solo reabre (quickActionTarget === 'reopen'): la otra rama que existía
   * acá ('dispatch', con el modal de guía de rastreo del paso 2→3) se quitó
   * — pedido explícito del dueño, esa transición ahora es directa y en
   * silencio (ver handleAdvanceToDispatchDirect). Sigue teniendo un
   * disparador real: el botón "Reabrir" del modal de "edición bloqueada"
   * (cuando el operador intenta cambiar dirección/método con el estimado ya
   * generado).
   */
  const handleConfirmQuickAction = async () => {
    if (quickActionTarget !== 'reopen' || !detail) return;
    try {
      await updateStatus({ consolidationUuid: detail.uuid, status: ConsolidationStatus.ABIERTO, currentStatus: ConsolidationStatus.CERRADO });
      toast.success('Orden de envío reabierta');
      setQuickActionTarget(null);
      await detailQuery.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo completar la acción.');
    }
  };

  /**
   * Transición directa CERRADO→DESPACHADO (paso 2→3), sin modal de
   * confirmación genérica: pedido explícito del dueño — "eso se hace del 3 al
   * 4 internamente", el paso 2→3 avanza solo, en silencio. La guía de rastreo
   * ya no se pide acá (vive como su propio punto en el timeline del paso 3,
   * que además bloquea su Siguiente hasta tenerla), así que no hace falta
   * ninguna pantalla intermedia para completar este salto.
   */
  const handleAdvanceToDispatchDirect = async () => {
    if (!detail) return;
    setIsAdvancingToDispatch(true);
    try {
      await updateStatus({ consolidationUuid: detail.uuid, status: ConsolidationStatus.DESPACHADO, currentStatus: ConsolidationStatus.CERRADO });
      toast.success('Orden de envío en el paso de Despacho');
      await detailQuery.invalidate();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo avanzar al paso de despacho.');
    } finally {
      setIsAdvancingToDispatch(false);
    }
  };

  /**
   * Abre el modal "¿está pagada?" al intentar avanzar del paso 2 (cobro) al
   * paso 3 (despacho). Solo tiene sentido preguntarlo si ya existe una
   * factura — sin factura no hay nada que marcar como pagado, así que en ese
   * caso el avance se comporta igual que "no": despacha directo.
   */
  const handleAdvanceToDispatchClick = () => {
    if (!detail) return;
    if (detail.billing_uuid && !detail.billing_is_paid) {
      setShowPaymentCheckModal(true);
      return;
    }
    handleAdvanceToDispatchDirect();
  };

  /**
   * Confirmación del modal de pago. `wasPaid` viene de la respuesta del
   * operador, no de un chequeo del sistema: es él quien sabe si el cliente
   * pagó por fuera (SINPE, efectivo) antes de que el sistema lo registre.
   */
  const handleConfirmPaymentCheck = async (wasPaid: boolean) => {
    if (!detail) return;
    setIsAdvancingToDispatch(true);
    try {
      if (wasPaid && detail.billing_uuid) {
        await markAsPaid({ billingUuid: detail.billing_uuid });
      }
      setShowPaymentCheckModal(false);
      await handleAdvanceToDispatchDirect();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo registrar el pago.');
    } finally {
      setIsAdvancingToDispatch(false);
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
      // NOTA: no se llama a bulk-status acá. ConsolidationsRepository.updateConsolidationStatus
      // (logistics.repo.ts) ya mueve todos los paquetes de la orden a ENTREGADO dentro de la
      // misma transacción del PATCH cuando newStatus === ENTREGADO — llamarlo de nuevo desde
      // acá era una llamada redundante que además fallaba (bulkUpdateStatus intentaba escribir
      // en packages.updated_at, columna que no existe en esa tabla) y hacía caer el avance de
      // paso entero al catch aunque el cambio de status ya se hubiera guardado.
      await updateStatus({ consolidationUuid, status: next, currentStatus: status });
      await detailQuery.invalidate();
      toast.success(`Estado actualizado a ${next}`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo avanzar el estado de la orden de envío. Intenta de nuevo.');
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

  /**
   * Una vez generado el estimado, la dirección y el método ya viajaron al
   * snapshot de pre_billing/billing (tarifa de zona, fee de entrega, dirección
   * impresa en la factura). Cambiarlos aquí no recalcularía nada: la factura
   * seguiría diciendo la dirección vieja con el cobro viejo. Por eso el flujo
   * correcto es reabrir —lo que descarta el estimado— y volver a generarlo.
   */
  const isEditLocked = !!detail && detail.status !== ConsolidationStatus.ABIERTO;

  const handleOpenAddressModal = async () => {
    if (!detail) return;
    if (isEditLocked) {
      setLockedEditTarget('address');
      return;
    }
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
    if (isEditLocked) {
      setLockedEditTarget('method');
      return;
    }
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
    // Si ya había estimado (paso 2), el backend lo recalcula en el lugar en
    // vez de borrarlo — avisar de eso explícitamente, porque si el estimado ya
    // se había compartido con el cliente hay que reenviarlo.
    const hadEstimate = !!detail?.pre_billing_uuid;
    try {
      await assignPackagesToOrder({ consolidationUuid: uuid, packageUuids: selectedPackageUuids });
      await detailQuery.invalidate();
      toast.success(
        hadEstimate
          ? 'Paquetes agregados. El estimado se recalculó — reenvíalo si ya lo compartiste con el cliente.'
          : 'Paquetes agregados a la orden de envío',
      );
      setShowAssignModal(false);
      setSelectedPackageUuids([]);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudieron agregar los paquetes.');
    }
  };

  /**
   * Copia la solicitud de despacho para pegarla en el chat con el proveedor.
   *
   * Copia en vez de abrir WhatsApp porque el destinatario es el proveedor, no el
   * cliente: no hay teléfono de destino en la orden. Por el mismo motivo no
   * estampa notified_at, que registra avisos al cliente.
   */
  /**
   * Abre el modal de solicitud con los datos del cliente ya puestos. El envío a
   * un tercero se resuelve editándolos antes de copiar.
   */
  const handleOpenShipmentRequestModal = () => {
    if (!detail) return;
    if (!detail.delivery_exact_address) {
      toast.error('Esta orden no tiene dirección de entrega asignada. Asígnala antes de solicitar el envío.');
      return;
    }
    setReceiverName(detail.customer_name);
    setReceiverPhone(detail.customer_phone ?? '');
    setReceiverIdCard(detail.customer_id_card ?? '');
    setShowShipmentRequestModal(true);
  };

  const handleCopyShipmentRequest = async () => {
    if (!detail) return;
    if (!detail.delivery_exact_address) {
      toast.error('Esta orden no tiene dirección de entrega asignada. Asígnala antes de solicitar el envío.');
      return;
    }
    setIsCopyingRequest(true);
    try {
      const message = buildShipmentRequestMessage({
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        customerName: detail.customer_name,
        // Quien recibe puede ser un tercero: van los valores del modal, no los
        // del cliente. customerName sigue siendo el dueño de los paquetes, que
        // es como el proveedor identifica el bulto.
        receiverName: receiverName,
        idCard: receiverIdCard,
        phone: receiverPhone,
        province: detail.delivery_province,
        canton: detail.delivery_canton,
        district: detail.delivery_district,
        exactAddress: detail.delivery_exact_address,
        packages: detail.packages.map((p) => ({
          storeName: p.store_name,
          trackingNumber: p.tracking_number,
          weightLb: Number(p.weight_lb),
        })),
        weightLb: Number(detail.total_weight_lb),
        templateBody: shipmentRequestTemplateBody,
      });
      await copyWhatsAppMessage(message);
      // Marca "envío solicitado" al proveedor — mismo criterio que
      // markPreBillingNotified: se estampa al copiar el mensaje, no al
      // confirmar una respuesta del proveedor (no hay forma de saberla).
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'mark-shipment-requested',
        consolidationUuid: uuid,
      });
      await detailQuery.invalidate();
      setShowShipmentRequestModal(false);
    } finally {
      setIsCopyingRequest(false);
    }
  };

  /**
   * Aviso al CLIENTE de que su envío fue solicitado — distinto del aviso al
   * proveedor de arriba. Abre WhatsApp (notifyWhatsApp, no copia) porque acá
   * sí hay un teléfono de destino claro: el del cliente dueño de la orden.
   */
  const handleNotifyCustomerShipmentRequested = async () => {
    if (!detail) return;
    if (!detail.customer_phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setIsNotifyingShipmentRequested(true);
    try {
      const message = buildShipmentRequestedCustomerMessage({
        firstName: detail.customer_name.split(' ')[0] || detail.customer_name,
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        templateBody: shipmentRequestedCustomerTemplateBody,
      });
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'mark-customer-notified-shipment',
        consolidationUuid: uuid,
      });
      await detailQuery.invalidate();
      await notifyWhatsApp(detail.customer_phone, message);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo preparar el aviso al cliente.');
    } finally {
      setIsNotifyingShipmentRequested(false);
    }
  };

  /**
   * Copia el mensaje que le pide al cliente confirmar la dirección registrada,
   * antes de generar el estimado.
   *
   * Copia en vez de abrir WhatsApp porque el operador ya viene de la
   * conversación con el cliente: pegar ahí es más directo que reabrir el chat.
   * Tampoco estampa notified_at — esa columna registra el aviso de paquetes
   * disponibles, no cada mensaje suelto que se le manda al cliente.
   */
  const handleCopyAddressConfirmation = async () => {
    if (!detail) return;
    if (!detail.delivery_exact_address) {
      toast.error('Esta orden no tiene dirección de entrega asignada. Asígnala antes de pedir la confirmación.');
      return;
    }
    setIsCopyingAddressConfirmation(true);
    try {
      const message = buildAddressConfirmationMessage({
        firstName: detail.customer_name.split(' ')[0] || detail.customer_name,
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        receiverName: detail.customer_name,
        idCard: detail.customer_id_card,
        phone: detail.customer_phone,
        province: detail.delivery_province,
        canton: detail.delivery_canton,
        district: detail.delivery_district,
        exactAddress: detail.delivery_exact_address,
        templateBody: addressConfirmationTemplateBody,
      });
      await copyWhatsAppMessage(message);
    } finally {
      setIsCopyingAddressConfirmation(false);
    }
  };

  /**
   * Copia el mensaje que le pide al cliente los datos de entrega, para cuando
   * la orden todavía no tiene dirección asignada.
   */
  const handleCopyAddressRequest = async () => {
    if (!detail) return;
    setIsCopyingAddressRequest(true);
    try {
      const message = buildAddressRequestMessage({
        firstName: detail.customer_name.split(' ')[0] || detail.customer_name,
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        templateBody: addressRequestTemplateBody,
      });
      await copyWhatsAppMessage(message);
    } finally {
      setIsCopyingAddressRequest(false);
    }
  };

  /** Aviso de despacho al cliente, con guía y enlace de rastreo. */
  const handleNotifyDispatch = async () => {
    if (!detail) return;
    if (!detail.customer_phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setIsNotifyingDispatch(true);
    try {
      const method = deliveryMethodsData?.data.find((m) => m.code === detail.delivery_method);
      const message = buildShipmentDispatchedMessage({
        firstName: detail.customer_name.split(' ')[0] || detail.customer_name,
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        deliveryMethodLabel: resolveDeliveryMethodLabel(detail.delivery_method, deliveryMethodsData?.data) || null,
        trackingCode: detail.tracking_code,
        trackingUrl: method?.tracking_url ?? null,
        packageCount: detail.packages.length,
        templateBody: shipmentDispatchedTemplateBody,
      });
      await notifyWhatsApp(detail.customer_phone, message);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo preparar el aviso de despacho.');
    } finally {
      setIsNotifyingDispatch(false);
    }
  };

  const handleOpenTrackingModal = () => {
    if (!detail) return;
    setTrackingDraft(detail.tracking_code ?? '');
    setShowTrackingModal(true);
  };

  /** Registra o corrige la guía después del despacho. */
  const handleSaveTrackingCode = async () => {
    if (!uuid) return;
    setIsSavingTracking(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'set-tracking-code',
        consolidationUuid: uuid,
        trackingCode: trackingDraft.trim() || null,
      });
      await detailQuery.invalidate();
      toast.success('Guía de rastreo actualizada');
      setShowTrackingModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar la guía de rastreo.');
    } finally {
      setIsSavingTracking(false);
    }
  };

  const handleOpenActualFeeModal = () => {
    if (!detail) return;
    // Prefill con el valor ya guardado si se está corrigiendo un ajuste
    // previo; vacío si es la primera vez, para no sugerir el fee facturado
    // como si ya fuera el real.
    setActualFeeDraft(detail.billing_actual_delivery_fee_crc != null ? String(detail.billing_actual_delivery_fee_crc) : '');
    setShowActualFeeModal(true);
  };

  /**
   * Guarda el costo real de envío informado por el transportista. Ajusta lo
   * que se le cobró al cliente (delivery_fee_crc/total_amount_crc) — NO toca
   * la ganancia registrada, ver ConsolidationsRepository.setActualDeliveryFee.
   */
  const handleSaveActualFee = async () => {
    if (!uuid) return;
    const parsed = Number(actualFeeDraft);
    if (actualFeeDraft.trim() === '' || Number.isNaN(parsed) || parsed < 0) {
      toast.error('Ingresa un monto válido.');
      return;
    }
    setIsSavingActualFee(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'set-actual-delivery-fee',
        consolidationUuid: uuid,
        actualDeliveryFeeCrc: parsed,
      });
      await detailQuery.invalidate();
      toast.success('Costo real de envío actualizado');
      setShowActualFeeModal(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar el costo real de envío.');
    } finally {
      setIsSavingActualFee(false);
    }
  };

  /** Marca que el vuelto calculado ya se le entregó al cliente. */
  const handleMarkChangeReturned = async () => {
    if (!uuid) return;
    setIsMarkingChangeReturned(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'mark-change-returned',
        consolidationUuid: uuid,
      });
      await detailQuery.invalidate();
      toast.success('Vuelto registrado como entregado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo registrar el vuelto.');
    } finally {
      setIsMarkingChangeReturned(false);
    }
  };

  /**
   * Cierra el wizard: paso 4 → 5 (Finalizada). El costo real de envío es
   * opcional — no bloquea Finalizar, igual que la guía de rastreo.
   */
  const handleFinalizeOrder = async () => {
    if (!uuid) return;
    setIsFinalizing(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'finalize',
        consolidationUuid: uuid,
      });
      await detailQuery.invalidate();
      toast.success('Orden de envío finalizada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo finalizar la orden de envío.');
    } finally {
      setIsFinalizing(false);
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

  // Requisito del paso 1 (Confirmación): el Siguiente ("Generar Estimado")
  // queda deshabilitado hasta tener dirección y método, con el motivo visible
  // en vez de dejar que el click falle contra el backend. generatePreBilling
  // también valida esto server-side (es la fuente de verdad); esto es solo
  // para no dejar que el operador dispare una llamada que sabemos que va a
  // fallar.
  const step1BlockedReason = !detail
    ? null
    : !detail.delivery_exact_address
      ? 'Confirma la dirección de entrega antes de generar el estimado.'
      : !detail.delivery_method
        ? 'Elige un método de envío antes de generar el estimado.'
        : null;

  return {
    detail,
    isLoadingDetail,
    handleBack,

    handleAdvanceStatus, isUpdating,
    quickActionTarget, setQuickActionTarget,
    handleConfirmQuickAction,
    handleGoBackToConfirmation,

    // Stepper: paso 2→3 con el modal de pago no bloqueante
    handleAdvanceToDispatchClick,
    showPaymentCheckModal, setShowPaymentCheckModal,
    handleConfirmPaymentCheck,
    isAdvancingToDispatch,

    // Stepper: paso 4 (Notificación y cierre) — costo real de envío + Finalizar
    showActualFeeModal, setShowActualFeeModal,
    actualFeeDraft, setActualFeeDraft,
    handleOpenActualFeeModal,
    handleSaveActualFee, isSavingActualFee,
    handleMarkChangeReturned, isMarkingChangeReturned,
    handleFinalizeOrder, isFinalizing,
    step1BlockedReason,

    isEditLocked,
    lockedEditTarget, setLockedEditTarget,

    handleCopyShipmentRequest, isCopyingRequest,
    handleNotifyCustomerShipmentRequested, isNotifyingShipmentRequested,
    handleCopyAddressConfirmation, isCopyingAddressConfirmation,
    handleCopyAddressRequest, isCopyingAddressRequest,
    handleOpenShipmentRequestModal,
    showShipmentRequestModal, setShowShipmentRequestModal,
    receiverName, setReceiverName,
    receiverPhone, setReceiverPhone,
    receiverIdCard, setReceiverIdCard,
    handleNotifyDispatch, isNotifyingDispatch,
    showTrackingModal, setShowTrackingModal,
    trackingDraft, setTrackingDraft,
    handleOpenTrackingModal,
    handleSaveTrackingCode, isSavingTracking,

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
