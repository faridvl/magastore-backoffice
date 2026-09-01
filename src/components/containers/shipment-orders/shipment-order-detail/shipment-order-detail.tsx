import React from 'react';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  Package,
  X,
  ArrowRight,
  FileText,
  CheckCircle,
  Download,
  RotateCcw,
  SendHorizonal,
  AlertCircle,
  MapPin,
  Pencil,
  Plus,
  Square,
  CheckSquare,
  MessageCircle,
  TrendingUp,
  Copy,
  Truck,
  Lock,
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { BillingDetailModal } from '@/components/common/billing-detail-modal/billing-detail-modal';
import { CustomerTypeBadge } from '@/components/common/customer-type-badge/customer-type-badge';
import { CustomerBillingMode } from '@/types/customer/customer.types';
import { useShipmentOrderDetail } from './use-shipment-order-detail';
import {
  ConsolidationStatus,
  ConsolidationPackage,
  ConsolidationDetail,
  AvailablePackage,
  ProfitShareStatus,
} from '@/types/logistics/logistics.types';
import { resolveZone } from '@/shared/constants/costa-rica-locations';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';

const STATUS_LABELS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
};

const STATUS_COLORS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'bg-amber-50 text-amber-600 border-amber-100',
  CERRADO: 'bg-blue-50 text-blue-600 border-blue-100',
  DESPACHADO: 'bg-violet-50 text-violet-600 border-violet-100',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const NEXT_STATUS_LABEL: Record<ConsolidationStatus, string | null> = {
  ABIERTO: null,
  CERRADO: 'Marcar como Despachado',
  DESPACHADO: 'Marcar como Entregado',
  ENTREGADO: null,
};

const formatCRC = (n: number) => `₡${Math.round(n).toLocaleString('es-CR')}`;

export const ShipmentOrderDetailContainer: React.FC = () => {
  const router = useRouter();
  const { uuid } = router.query;
  const resolvedUuid = router.isReady ? (uuid as string) : undefined;

  const {
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
    isSavingAddress,

    showMethodModal, setShowMethodModal,
    selectedMethod, setSelectedMethod,
    isSavingMethod,
    handleOpenMethodModal,
    handleConfirmMethodChange,

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

    dispatchTrackingCode, setDispatchTrackingCode,
    isEditLocked,
    lockedEditTarget, setLockedEditTarget,
    handleCopyShipmentRequest, isCopyingRequest,
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
  } = useShipmentOrderDetail(resolvedUuid);
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
  const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);

  if (isLoadingDetail || !resolvedUuid) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <X size={32} className="text-red-400" />
        <p className="text-slate-500 text-sm">No se pudo cargar la orden de envío.</p>
        <button onClick={handleBack} className="mt-2 px-6 py-2 bg-slate-100 rounded-xl text-sm font-bold">
          Volver al listado
        </button>
      </div>
    );
  }

  const hasBilling = !!detail.billing_uuid;
  const hasPreBilling = !!detail.pre_billing_uuid;
  const preBillingConfirmed = !!detail.pre_billing_confirmed;
  const isPaid = !!detail.billing_is_paid;
  // Lo facturado manda sobre el estimado: es la cifra que el cliente debe pagar.
  const amountToShow = detail.billing_total_amount_crc ?? detail.pre_billing_amount;
  const deliveryMethodEntity = deliveryMethodsData?.data.find((m) => m.code === detail.delivery_method);
  const isDispatched = detail.status === ConsolidationStatus.DESPACHADO || detail.status === ConsolidationStatus.ENTREGADO;
  // El aviso de despacho necesita las tres cosas: sin guía no hay qué rastrear,
  // y sin URL configurada el mensaje llevaría un enlace vacío.
  const canNotifyDispatch = isDispatched && !!detail.tracking_code && !!deliveryMethodEntity?.tracking_url;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col min-w-0 w-full md:w-auto">
          {/* Oculto en móvil: la flecha del header ya cumple esta función y en
              pantalla angosta este enlace consumía una línea entera. */}
          <button onClick={handleBack} className="hidden sm:flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest mb-2">
            <ChevronLeft size={14} /> Volver a órdenes de envío
          </button>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <Typography variant={TypographyVariant.HEADER} className="tracking-tighter break-words">
              {detail.customer_name}
            </Typography>
            {detail.customer_type_name && detail.customer_type_billing_mode !== 'NORMAL' && (
              <CustomerTypeBadge
                name={detail.customer_type_name}
                mode={detail.customer_type_billing_mode as CustomerBillingMode}
                discount={detail.customer_type_discount_percent}
              />
            )}
          </div>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 break-words">
            {detail.customer_code} · {detail.customer_email}
          </p>
        </div>
        {/* Acciones de estado + badge. Antes vivían al pie de la página, debajo
            de la rentabilidad, donde el operador no las encontraba. En móvil la
            acción principal ocupa el ancho y las secundarias van a su lado. */}
        <div className="flex items-center gap-2 flex-wrap w-full md:w-auto">
          {detail.status === ConsolidationStatus.CERRADO && !isPaid && (
            <button
              onClick={() => setQuickActionTarget('reopen')}
              disabled={isUpdating}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-[11px] hover:bg-amber-100 transition-all disabled:opacity-40"
            >
              <RotateCcw size={13} />
              Volver a abrir
            </button>
          )}
          {NEXT_STATUS_LABEL[detail.status] && (
            <button
              onClick={detail.status === ConsolidationStatus.CERRADO ? () => setQuickActionTarget('dispatch') : handleAdvanceStatus}
              disabled={isUpdating}
              className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all shadow-sm disabled:opacity-40"
            >
              <ArrowRight size={13} />
              {isUpdating ? 'Actualizando...' : NEXT_STATUS_LABEL[detail.status]}
            </button>
          )}
          <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_COLORS[detail.status]}`}>
            {STATUS_LABELS[detail.status]}
          </span>
        </div>
      </div>

      {/* STATS ROW — el estado ya está en el badge de arriba y la cantidad de
          paquetes en la lista de abajo; aquí van los datos que no se ven en
          ningún otro lado de la pantalla. */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso Total</p>
          <p className="font-black text-slate-800 text-base">
            {Number(detail.total_weight_lb).toFixed(2)} <span className="text-xs text-slate-400">lb</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Monto</p>
          <p className="font-black text-slate-800 text-base">
            {amountToShow != null ? formatCRC(Number(amountToShow)) : <span className="text-slate-300">—</span>}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center col-span-2 sm:col-span-1">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pago</p>
          {hasBilling ? (
            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border inline-block ${isPaid ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {isPaid ? 'Pagada' : 'Pendiente'}
            </span>
          ) : (
            <span className="text-[11px] font-bold text-slate-300">Sin factura</span>
          )}
        </div>
      </div>

      {/* DIRECCIÓN DE ENTREGA
          En móvil el contenido y las acciones se apilan: con flex-row fijo el
          texto se comprimía hasta partirse letra por letra mientras el botón
          conservaba su ancho. */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
            <MapPin size={16} className="text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dirección de entrega</p>
            {detail.delivery_exact_address ? (
              <>
                <p className="text-sm font-bold text-slate-800">
                  {detail.delivery_address_label || 'Dirección'}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {detail.delivery_exact_address}, {detail.delivery_district}, {detail.delivery_canton}, {detail.delivery_province}
                  {detail.delivery_canton ? ` · Zona ${resolveZone(detail.delivery_canton)}` : ''}
                </p>
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin dirección asignada</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 justify-end">
          {/* Solo con dirección asignada: pedirle al cliente que confirme una
              dirección que no tenemos no significa nada. */}
          {detail.delivery_exact_address ? (
            <button
              onClick={handleCopyAddressConfirmation}
              disabled={isCopyingAddressConfirmation}
              title="Copiar mensaje para que el cliente confirme la dirección"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <Copy size={12} />
              Confirmar dirección
            </button>
          ) : (
            /* Sin dirección lo que toca es pedirla, no confirmarla. */
            <button
              onClick={handleCopyAddressRequest}
              disabled={isCopyingAddressRequest}
              title="Copiar mensaje para pedirle los datos de entrega al cliente"
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all disabled:opacity-40 whitespace-nowrap"
            >
              <Copy size={12} />
              Pedir dirección
            </button>
          )}
          {/* Siempre visible: ocultarlo fuera de ABIERTO dejaba al operador sin
              saber por qué no podía cambiarla. Con estimado generado, explica que
              hay que reabrir en vez de desaparecer. */}
          <button
            onClick={handleOpenAddressModal}
            disabled={isLoadingAddresses}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40"
          >
            <Pencil size={12} />
            Cambiar
          </button>
        </div>
      </div>

      {/* MÉTODO DE ENVÍO */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
            <SendHorizonal size={16} className="text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Método de envío</p>
            {detail.delivery_method ? (
              <p className="text-sm font-bold text-slate-800">{resolveDeliveryMethodLabel(detail.delivery_method, deliveryMethodsData?.data)}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin elegir — se pedirá al generar el estimado</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0 justify-end">
          {/* Solicitud al proveedor: copia, no abre WhatsApp — el destinatario
              es el forwarder, no el cliente. Pasa por un modal para poder
              corregir a quién se entrega cuando el envío va a un tercero. */}
          <button
            onClick={handleOpenShipmentRequestModal}
            disabled={isCopyingRequest}
            title="Preparar solicitud de envío para el proveedor"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all disabled:opacity-40 whitespace-nowrap"
          >
            <Copy size={12} />
            Solicitar envío
          </button>
          <button
            onClick={handleOpenMethodModal}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40 whitespace-nowrap"
          >
            <Pencil size={12} />
            Cambiar
          </button>
        </div>
      </div>

      {/* GUÍA DE RASTREO — solo tras despachar: antes no existe número que registrar. */}
      {isDispatched && (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
              <Truck size={16} className="text-slate-600" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Guía de rastreo</p>
              {detail.tracking_code ? (
                <>
                  <p className="text-sm font-bold text-slate-800 font-mono break-all">{detail.tracking_code}</p>
                  {detail.dispatched_at && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Despachado el {new Date(detail.dispatched_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-sm text-slate-400 italic">Sin guía registrada — agrégala para avisar al cliente</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 justify-end">
            {canNotifyDispatch && (
              <button
                onClick={handleNotifyDispatch}
                disabled={isNotifyingDispatch}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-xl font-bold text-[11px] hover:bg-emerald-500 transition-all disabled:opacity-40 whitespace-nowrap"
              >
                <MessageCircle size={12} />
                Avisar
              </button>
            )}
            <button
              onClick={handleOpenTrackingModal}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all whitespace-nowrap"
            >
              <Pencil size={12} />
              {detail.tracking_code ? 'Editar' : 'Agregar'}
            </button>
          </div>
        </div>
      )}

      {/* PRE-BILLING / BILLING CARD */}
      {!hasBilling && (
        <div>
          {!hasPreBilling ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-5">
              <div>
                <p className="text-xs font-black text-slate-700">Prefactura</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Genera el estimado para enviar al cliente. Esto cierra la orden de envío.
                </p>
              </div>
              <button
                onClick={handleGenerateEstimateClick}
                disabled={detail.packages.length === 0 || isGeneratingPreBilling}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-40 flex-shrink-0"
              >
                <FileText size={14} />
                {isGeneratingPreBilling ? 'Generando...' : 'Generar Estimado'}
              </button>
            </div>
          ) : preBillingConfirmed ? (
            <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm flex flex-wrap items-center justify-between gap-3 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-800">Prefactura confirmada</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    {formatCRC(detail.pre_billing_amount ?? 0)}
                    {detail.pre_billing_notified_at && (
                      <> · Notificado el {new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleNotifyPreBilling}
                  disabled={isNotifyingPreBilling}
                  title={detail.pre_billing_notified_at ? `Notificado el ${new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}` : 'Enviar aviso de cobro por WhatsApp'}
                  className="flex items-center gap-1.5 px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all disabled:opacity-40"
                >
                  <MessageCircle size={13} />
                  {detail.pre_billing_notified_at ? 'Reenviar' : 'WhatsApp'}
                </button>
                <button
                  onClick={() => handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                  className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all"
                >
                  <Download size={13} />
                  PDF
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-amber-100 shadow-sm p-5">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <p className="text-xs font-black text-amber-900">Estimado pendiente de confirmación</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    {detail.pre_billing_delivery_method
                      ? `Entrega: ${resolveDeliveryMethodLabel(detail.pre_billing_delivery_method, deliveryMethodsData?.data)}`
                      : ''}
                    {detail.pre_billing_notified_at && (
                      <>{detail.pre_billing_delivery_method ? ' · ' : ''}Notificado el {new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}</>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleNotifyPreBilling}
                    disabled={isNotifyingPreBilling}
                    title={detail.pre_billing_notified_at ? `Notificado el ${new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}` : 'Enviar aviso de cobro por WhatsApp'}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-[10px] hover:bg-amber-50 transition-all disabled:opacity-40"
                  >
                    <MessageCircle size={12} />
                    {detail.pre_billing_notified_at ? 'Reenviar' : 'WhatsApp'}
                  </button>
                  <button
                    onClick={() => handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-[10px] hover:bg-amber-50 transition-all"
                  >
                    <Download size={12} />
                    PDF
                  </button>
                  <button
                    onClick={() => {
                      setPreBillingDeliveryMethod(detail.pre_billing_delivery_method ?? activeDeliveryMethods[0]?.code ?? '');
                      setShowPreBillingModal(true);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-[10px] hover:bg-amber-50 transition-all"
                  >
                    <RotateCcw size={12} />
                    Recalcular
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <p className="text-2xl font-black text-amber-900">
                  {formatCRC(detail.pre_billing_amount ?? 0)}
                </p>
                <button
                  onClick={handleConfirmPreBilling}
                  disabled={isConfirmingPreBilling}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-500 transition-all disabled:opacity-40"
                >
                  <CheckCircle size={14} />
                  {isConfirmingPreBilling ? 'Confirmando...' : 'Confirmar Estimado'}
                </button>
              </div>
              <div className="flex items-start gap-2 pt-3 border-t border-amber-100/70">
                <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-amber-700/80 leading-relaxed">
                  Estimado calculado con las tarifas vigentes al generarlo. Si las tarifas cambiaron desde entonces
                  y ya compartiste este monto con el cliente, usa &quot;Recalcular&quot; antes de confirmar para evitar
                  facturar con un monto desactualizado.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {hasBilling && (
        <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-black text-emerald-800">Factura generada</p>
              <p className="text-[10px] text-emerald-600 mt-0.5">
                {isPaid ? 'Pagada' : 'Pendiente de pago'}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowBillingModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all"
          >
            <FileText size={14} />
            Ver factura
          </button>
        </div>
      )}

      {/* PACKAGES LIST */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Paquetes en esta orden de envío
          </p>
          {detail.status === ConsolidationStatus.ABIERTO && (
            <button
              onClick={handleOpenAssignModal}
              disabled={isLoadingAvailable}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40"
            >
              <Plus size={12} />
              Agregar paquetes
            </button>
          )}
        </div>
        {detail.packages.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            Sin paquetes asignados aún.
          </div>
        ) : (
          <>
            <PackageTable
              packages={detail.packages}
              canUnassign={detail.status === ConsolidationStatus.ABIERTO && !hasBilling && detail.packages.length > 1}
              isUnassigning={isUnassigning}
              onUnassign={handleUnassignPackage}
            />
            {detail.status === ConsolidationStatus.ABIERTO && !hasBilling && detail.packages.length === 1 && (
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Es el único paquete de la orden — no se puede quitar. Para vaciarla, elimina la orden completa desde el listado.
              </p>
            )}
          </>
        )}
      </div>

      {/* RENTABILIDAD (solo interno — no aparece en el PDF ni en nada visible al cliente) */}
      {detail.packages.length > 0 && <ProfitCard detail={detail} />}

      {/* Las acciones de estado viven ahora en el header — ver bloque HEADER. */}

      {/* MODAL: DETALLE DE FACTURA (mismo modal que Facturación) */}
      {showBillingModal && (
        <BillingDetailModal
          billingDetail={billingDetail}
          isLoading={isLoadingBillingDetail}
          onClose={() => setShowBillingModal(false)}
          onMarkAsPaid={handleMarkAsPaid}
          isMarkingPaid={isMarkingPaid}
          onDownloadPdf={handleDownloadBillingPdf}
          isDownloadingPdf={isDownloadingBillingPdf}
        />
      )}

      {/* MODAL: REABRIR / DESPACHAR */}
      {quickActionTarget && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setQuickActionTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${quickActionTarget === 'reopen' ? 'bg-amber-50' : 'bg-violet-50'}`}>
                {quickActionTarget === 'reopen'
                  ? <RotateCcw size={18} className="text-amber-500" />
                  : <SendHorizonal size={18} className="text-violet-500" />
                }
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {quickActionTarget === 'reopen' ? '¿Volver a abrir esta orden de envío?' : '¿Marcar como despachada?'}
                </p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  {quickActionTarget === 'reopen'
                    ? (hasBilling
                        ? 'La orden volverá a ABIERTO y la factura generada se eliminará (quedó calculada con el peso/paquetes actuales). Deberás generar el estimado y confirmarlo de nuevo tras editar.'
                        : hasPreBilling
                          ? 'La orden volverá a ABIERTO y el estimado generado se eliminará (quedó calculado con el peso/paquetes actuales). Deberás generarlo de nuevo tras editar.'
                          : 'La orden de envío volverá a estado ABIERTO y podrás seguir editándola.')
                    : 'La orden de envío pasará a estado DESPACHADO.'
                  }
                </p>
              </div>
            </div>
            {/* La guía es opcional: el operador no siempre la tiene al entregar
                el bulto. Se puede registrar después desde la tarjeta de guía. */}
            {quickActionTarget === 'dispatch' && !deliveryMethodEntity?.is_pickup && (
              <div className="mb-5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                  Guía de rastreo (opcional)
                </label>
                <input
                  type="text"
                  value={dispatchTrackingCode}
                  onChange={(e) => setDispatchTrackingCode(e.target.value)}
                  placeholder="Ej. EZ292332205CR"
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400"
                />
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Podés agregarla después. Sin guía no se puede avisar al cliente.
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setQuickActionTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmQuickAction}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 ${quickActionTarget === 'reopen' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-500 hover:bg-violet-600'}`}
              >
                {quickActionTarget === 'reopen'
                  ? <><RotateCcw size={14} /> Reabrir</>
                  : <><SendHorizonal size={14} /> Despachar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERAR PREFACTURA */}
      {showPreBillingModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowPreBillingModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-xl">
                <FileText size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Generar Prefactura
              </Typography>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Método de entrega
              </label>
              <div className="space-y-2">
                {activeDeliveryMethods.map((dm) => (
                  <button
                    key={dm.code}
                    onClick={() => setPreBillingDeliveryMethod(dm.code)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                      preBillingDeliveryMethod === dm.code
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm">{dm.name}</span>
                    {preBillingDeliveryMethod === dm.code && (
                      <CheckCircle size={16} className="text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPreBillingModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePreBilling}
                disabled={isGeneratingPreBilling}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isGeneratingPreBilling ? 'Generando...' : 'Generar Estimado'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR DIRECCIÓN DE ENTREGA */}
      {showAddressModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAddressModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-xl">
                <MapPin size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Cambiar dirección de entrega
              </Typography>
            </div>

            {addressOptions.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">Este cliente no tiene direcciones registradas.</p>
            ) : (
              <div className="space-y-2 mb-6">
                {addressOptions.map((addr) => (
                  <button
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                      selectedAddressId === addr.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Default' : ''}</p>
                      <p className={`text-[11px] mt-0.5 ${selectedAddressId === addr.id ? 'text-slate-300' : 'text-slate-400'}`}>
                        {addr.exact_address}, {addr.district}, {addr.canton}, {addr.province}
                      </p>
                    </div>
                    {selectedAddressId === addr.id && (
                      <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAddressModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAddressChange}
                disabled={!selectedAddressId || isSavingAddress}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isSavingAddress ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CAMBIAR MÉTODO DE ENVÍO */}
      {showMethodModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowMethodModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-xl">
                <SendHorizonal size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Cambiar método de envío
              </Typography>
            </div>

            <div className="space-y-2 mb-6">
              {activeDeliveryMethods.map((dm) => (
                <button
                  key={dm.code}
                  onClick={() => setSelectedMethod(dm.code)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                    selectedMethod === dm.code
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-sm">{dm.name}</span>
                  {selectedMethod === dm.code && (
                    <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowMethodModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmMethodChange}
                disabled={!selectedMethod || isSavingMethod}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isSavingMethod ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SOLICITUD AL PROVEEDOR — permite corregir a quién se entrega
          antes de copiar, para los envíos que van a un tercero. Los datos no se
          guardan: viven solo mientras el modal está abierto. */}
      {showShipmentRequestModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowShipmentRequestModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Copy size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Solicitud al proveedor
              </Typography>
            </div>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              Datos de quien recibe. Vienen del cliente; corrígelos si el envío va a otra persona.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nombre de quien recibe</label>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Teléfono</label>
                <input
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Cédula</label>
                <input
                  value={receiverIdCard}
                  onChange={(e) => setReceiverIdCard(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowShipmentRequestModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleCopyShipmentRequest}
                disabled={isCopyingRequest}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isCopyingRequest ? 'Copiando...' : 'Copiar solicitud'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GUÍA DE RASTREO (registrar o corregir tras el despacho) */}
      {showTrackingModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowTrackingModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Truck size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Guía de rastreo
              </Typography>
            </div>

            <input
              type="text"
              value={trackingDraft}
              onChange={(e) => setTrackingDraft(e.target.value)}
              placeholder="Ej. EZ292332205CR"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 mb-2"
            />
            <p className="text-[11px] text-slate-400 mb-6">
              {deliveryMethodEntity?.tracking_url
                ? 'Con la guía registrada podés enviarle el aviso de despacho al cliente.'
                : 'Este método de entrega no tiene enlace de rastreo configurado. Agregalo en Ajustes → Métodos de entrega para poder avisar al cliente.'}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowTrackingModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveTrackingCode}
                disabled={isSavingTracking}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isSavingTracking ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDICIÓN BLOQUEADA — explica por qué hay que reabrir en vez de
          dejar el botón inerte o escondido. */}
      {lockedEditTarget && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setLockedEditTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 rounded-xl bg-amber-50 flex-shrink-0">
                <Lock size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {lockedEditTarget === 'address' ? 'La dirección ya no se puede cambiar' : 'El método de envío ya no se puede cambiar'}
                </p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  {hasBilling
                    ? 'La factura ya guardó la dirección y la tarifa de entrega aplicadas. Cambiarlas ahora no recalcularía el monto cobrado. Para editarlas, volvé a abrir la orden — se descartará la factura y deberás generar el estimado de nuevo.'
                    : 'El estimado ya se calculó con estos datos. Para cambiarlos, volvé a abrir la orden — se descartará el estimado y deberás generarlo de nuevo.'}
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setLockedEditTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Entendido
              </button>
              {detail.status === ConsolidationStatus.CERRADO && !isPaid && (
                <button
                  onClick={() => {
                    setLockedEditTarget(null);
                    setQuickActionTarget('reopen');
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw size={14} /> Reabrir
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: AGREGAR PAQUETES */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Package size={18} className="text-slate-600" />
                </div>
                <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                  Agregar Paquetes
                </Typography>
              </div>
              {selectedPackageUuids.length > 0 && (
                <span className="bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full">
                  {selectedPackageUuids.length} seleccionado(s)
                </span>
              )}
            </div>

            {isLoadingAvailable ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : availablePackages.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No hay paquetes disponibles para este cliente.</p>
                <p className="text-slate-400 text-xs mt-1">Los paquetes ya asignados a otra orden de envío no aparecen aquí.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
                {availablePackages.map((pkg: AvailablePackage) => {
                  const selected = selectedPackageUuids.includes(pkg.uuid);
                  return (
                    <button
                      key={pkg.uuid}
                      onClick={() => handleTogglePackage(pkg.uuid)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${
                        selected
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-slate-50 border-transparent hover:border-slate-200'
                      }`}
                    >
                      {selected
                        ? <CheckSquare size={18} className="text-amber-600 flex-shrink-0" />
                        : <Square size={18} className="text-slate-300 flex-shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="font-mono text-sm font-bold text-slate-800 truncate" title={pkg.tracking_number}>
                          {pkg.tracking_number}{pkg.store_name ? ` — ${pkg.store_name}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          {Number(pkg.weight_lb).toFixed(2)} lb · {pkg.package_type} · {pkg.status}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={selectedPackageUuids.length === 0 || isAssigning}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isAssigning ? 'Agregando...' : `Agregar ${selectedPackageUuids.length || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const ProfitCard: React.FC<{ detail: ConsolidationDetail }> = ({ detail }) => (
  detail.billing_uuid ? <BilledProfitCard detail={detail} /> : <EstimatedProfitCard detail={detail} />
);

// Cuando ya existe factura, la ganancia mostrada es la congelada en `billing`
// al momento de confirmar (migración 018) — no se recalcula con datos en vivo,
// para que editar/desactivar una tarifa después no altere retroactivamente el
// número de una factura ya emitida.
const BilledProfitCard: React.FC<{ detail: ConsolidationDetail }> = ({ detail }) => {
  const cobroTotal = Number(detail.billing_total_amount_crc ?? 0);
  const courierCost = detail.billing_courier_cost_crc != null ? Number(detail.billing_courier_cost_crc) : null;
  const deliveryCost = detail.billing_delivery_cost_crc != null ? Number(detail.billing_delivery_cost_crc) : null;
  const gananciaTotal = detail.billing_profit_crc != null ? Number(detail.billing_profit_crc) : null;
  const margen = gananciaTotal != null && cobroTotal > 0 ? (gananciaTotal / cobroTotal) * 100 : null;
  const hasUnknownCost = detail.billing_has_unknown_cost === true;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Rentabilidad · Solo interno
          </p>
        </div>
        <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-wider">
          Ganancia final (facturada)
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-4 py-3 bg-slate-50 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo courier</p>
          <p className="text-xs font-bold text-slate-700">{courierCost != null ? formatCRC(courierCost) : '—'}</p>
        </div>
        <div className="px-4 py-3 bg-slate-50 rounded-2xl">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo entrega</p>
          <p className="text-xs font-bold text-slate-700">
            {deliveryCost != null ? formatCRC(deliveryCost) : <span className="text-slate-400 italic font-medium">Sin dato al facturar</span>}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl px-5 py-4 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobro total</p>
          <p className="text-sm font-black text-white">{formatCRC(cobroTotal)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo total</p>
          <p className="text-sm font-black text-white">
            {formatCRC((courierCost ?? 0) + (deliveryCost ?? 0))}{hasUnknownCost ? ' *' : ''}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ganancia</p>
          <p className={`text-sm font-black ${gananciaTotal != null && gananciaTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {gananciaTotal != null ? formatCRC(gananciaTotal) : '—'}
            {margen != null && <span className="text-[10px] font-bold text-slate-400 ml-1.5">{margen.toFixed(0)}%</span>}
          </p>
        </div>
      </div>

      <ProfitShareRow detail={detail} />

      {hasUnknownCost && (
        <p className="mt-3 text-[10px] text-amber-600">
          * El costo real de la entrega no estaba confirmado al momento de facturar — la ganancia mostrada no lo descuenta.
        </p>
      )}
    </div>
  );
};

/**
 * Reparto de la ganancia de esta orden: cuánto le toca a Farid y cuánto queda.
 * Solo existe desde que se genera el estimado — antes de eso no hay fila que
 * mostrar. Mientras siga en ESTIMADO se marca como provisional, porque
 * reabrir la orden o mover paquetes lo descarta y lo vuelve a calcular.
 */
const ProfitShareRow: React.FC<{
  detail: ConsolidationDetail;
  // La tarjeta del estimado calcula la ganancia en vivo (billing_profit_crc aún
  // es null porque no hay factura); la tarjeta facturada usa la congelada.
  profitOverride?: number;
}> = ({ detail, profitOverride }) => {
  if (detail.profit_share_crc == null) return null;

  const share = Number(detail.profit_share_crc);
  const percent = detail.profit_share_percent != null ? Number(detail.profit_share_percent) : null;
  const isEstimated = detail.profit_share_status === ProfitShareStatus.ESTIMADO;

  const profit = profitOverride ?? (detail.billing_profit_crc != null ? Number(detail.billing_profit_crc) : null);
  const neto = profit != null ? profit - share : null;

  return (
    <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-5 py-3 bg-violet-50 rounded-2xl">
      <div>
        <p className="text-[9px] font-black text-violet-400 uppercase tracking-widest">
          Farid{percent != null ? ` · ${percent}%` : ''}
          {isEstimated && <span className="ml-1 text-slate-400">(provisional)</span>}
        </p>
        <p className="text-sm font-black text-violet-700">{formatCRC(share)}</p>
      </div>
      {neto != null && (
        <div className="text-right">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Neto Magastore</p>
          <p className={`text-sm font-black ${neto >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {formatCRC(neto)}
          </p>
        </div>
      )}
    </div>
  );
};

const EstimatedProfitCard: React.FC<{ detail: ConsolidationDetail }> = ({ detail }) => {
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();

  // Cobro con las tarifas del snapshot de la prefactura; si la orden sigue
  // abierta, con las vigentes de system_settings (el monto puede variar hasta
  // que se genere el estimado).
  const usingSnapshot = detail.pre_billing_rate_usd != null && detail.pre_billing_exchange != null;
  const rateUsd = Number(usingSnapshot ? detail.pre_billing_rate_usd : detail.current_price_per_lb);
  const exchange = Number(usingSnapshot ? detail.pre_billing_exchange : detail.current_exchange_rate);

  // Regla de cobro del cliente. Sin esto la rentabilidad muestra margen sobre
  // precio de lista: para un cliente AL_COSTO la ganancia real es ₡0 y para uno
  // con descuento el margen queda inflado.
  const billingMode = detail.customer_type_billing_mode ?? CustomerBillingMode.NORMAL;
  const discountPercent = Number(detail.customer_type_discount_percent ?? 0);
  const isAlCosto = billingMode === CustomerBillingMode.AL_COSTO;
  const discountFactor = billingMode === CustomerBillingMode.DESCUENTO ? 1 - discountPercent / 100 : 1;

  const rows = detail.packages.map((pkg) => {
    const weight = Number(pkg.weight_lb);
    const hasCost = pkg.courier_cost_usd != null && pkg.tc_banco != null;
    const costo = hasCost ? Number(pkg.courier_cost_usd) * Number(pkg.tc_banco) : null;
    // AL_COSTO cobra exactamente el costo real del paquete, no la tarifa por peso.
    const cobro = isAlCosto ? (costo ?? 0) : weight * rateUsd * exchange * discountFactor;
    return { pkg, cobro, costo, ganancia: costo != null ? cobro - costo : null };
  });

  const totalWeight = Number(detail.total_weight_lb);
  const chargedWeight = Math.max(totalWeight, Number(detail.current_min_weight));

  // Entrega: cobro del snapshot de la prefactura si existe; si no, la tarifa
  // vigente que matchea método/zona/peso. El costo real siempre es el vigente
  // de delivery_rates (no se snapshotea).
  const deliveryMethod = detail.pre_billing_delivery_method ?? detail.delivery_method;
  const deliveryMethodEntity = deliveryMethodsData?.data.find((m) => m.code === deliveryMethod);
  const hasDelivery = deliveryMethod != null && !deliveryMethodEntity?.is_pickup;
  const deliveryFee = hasDelivery
    ? Number(detail.pre_billing_fee_crc ?? detail.delivery_fee_estimate_crc ?? 0)
    : 0;
  const deliveryCost = hasDelivery ? detail.delivery_cost_crc : 0;
  const missingDeliveryCost = hasDelivery && deliveryCost == null;

  // El flete sigue la regla del cliente; la entrega local se cobra completa en
  // todos los modos — es un costo trasladado, no margen propio (ver generatePreBilling).
  const fleteTotal = isAlCosto
    ? rows.reduce((acc, r) => acc + (r.costo ?? 0), 0)
    : chargedWeight * rateUsd * exchange * discountFactor;
  const cobroTotal = fleteTotal + deliveryFee;
  const costoTotal = rows.reduce((acc, r) => acc + (r.costo ?? 0), 0) + (deliveryCost ?? 0);
  const missingCost = rows.some((r) => r.costo == null);
  const gananciaTotal = cobroTotal - costoTotal;
  const margen = cobroTotal > 0 ? (gananciaTotal / cobroTotal) * 100 : 0;
  // En AL_COSTO el cobro sale de los costos reales, no del peso: el mínimo no
  // interviene, así que avisar de él sería engañoso.
  const minApplied = chargedWeight > totalWeight && !isAlCosto;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Rentabilidad · Solo interno
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* La regla de cobro explica por qué el margen no es el de lista. */}
          {billingMode !== CustomerBillingMode.NORMAL && (
            <CustomerTypeBadge
              name={detail.customer_type_name ?? 'Tipo especial'}
              mode={billingMode as CustomerBillingMode}
              discount={discountPercent}
            />
          )}
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {usingSnapshot ? 'Tarifas del estimado' : 'Tarifas vigentes (sin estimado aún)'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(({ pkg, cobro, costo, ganancia }) => (
          <div key={pkg.uuid} className="px-4 py-3 bg-slate-50 rounded-2xl min-w-0">
            <p className="font-mono text-sm font-bold text-slate-800 truncate" title={pkg.tracking_number}>{pkg.tracking_number}</p>
            <p className="text-[10px] text-slate-400 mb-2 truncate">
              {Number(pkg.weight_lb).toFixed(2)} lb{pkg.store_name ? ` · ${pkg.store_name}` : ''}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobro</p>
                <p className="text-xs font-bold text-slate-700">{formatCRC(cobro)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo real</p>
                <p className="text-xs font-bold text-slate-700">
                  {costo != null ? formatCRC(costo) : <span className="text-slate-400 italic font-medium">Sin datos</span>}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ganancia</p>
                <p className={`text-xs font-black ${ganancia == null ? 'text-slate-400' : ganancia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {ganancia != null ? formatCRC(ganancia) : '—'}
                </p>
              </div>
            </div>
          </div>
        ))}

        {hasDelivery && (
          <div className="px-4 py-3 bg-slate-50 rounded-2xl">
            <p className="text-sm font-bold text-slate-800">Entrega · {resolveDeliveryMethodLabel(deliveryMethod, deliveryMethodsData?.data)}</p>
            <p className="text-[10px] text-slate-400 mb-2">
              {detail.pre_billing_fee_crc != null ? 'Cobro del estimado' : 'Cobro con tarifa vigente'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobro</p>
                <p className="text-xs font-bold text-slate-700">{formatCRC(deliveryFee)}</p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo real</p>
                <p className="text-xs font-bold text-slate-700">
                  {deliveryCost != null ? formatCRC(deliveryCost) : <span className="text-slate-400 italic font-medium">Por confirmar</span>}
                </p>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ganancia</p>
                <p className={`text-xs font-black ${deliveryCost == null ? 'text-slate-400' : deliveryFee - deliveryCost >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {deliveryCost != null ? formatCRC(deliveryFee - deliveryCost) : '—'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 bg-slate-900 rounded-2xl px-5 py-4 grid grid-cols-3 gap-2">
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cobro total</p>
          <p className="text-sm font-black text-white">{formatCRC(cobroTotal)}</p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Costo total</p>
          <p className="text-sm font-black text-white">
            {formatCRC(costoTotal)}{missingCost || missingDeliveryCost ? ' *' : ''}
          </p>
        </div>
        <div>
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ganancia</p>
          <p className={`text-sm font-black ${gananciaTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCRC(gananciaTotal)}
            <span className="text-[10px] font-bold text-slate-400 ml-1.5">{margen.toFixed(0)}%</span>
          </p>
        </div>
      </div>

      <ProfitShareRow detail={detail} profitOverride={gananciaTotal} />

      <div className="mt-3 space-y-0.5">
        {missingCost && (
          <p className="text-[10px] text-amber-600">
            * Ganancia parcial: hay paquetes registrados sin costo de courier o sin tipo de cambio del banco.
          </p>
        )}
        {missingDeliveryCost && (
          <p className="text-[10px] text-amber-600">
            * El costo real de la entrega está por confirmar en la tarifa de {resolveDeliveryMethodLabel(deliveryMethod, deliveryMethodsData?.data)} — no se incluye en el costo total.
          </p>
        )}
        {minApplied && (
          <p className="text-[10px] text-slate-400">
            El cobro total incluye el ajuste por peso mínimo ({Number(detail.current_min_weight)} lb), por eso puede superar la suma por paquete.
          </p>
        )}
        <p className="text-[10px] text-slate-400">
          No incluye el fee de entrega (Correos/Tracopa), que es un traslado de costo. Este cálculo no aparece en el estimado ni en la factura del cliente.
        </p>
      </div>
    </div>
  );
};

const PackageTable: React.FC<{
  packages: ConsolidationPackage[];
  canUnassign: boolean;
  isUnassigning: boolean;
  onUnassign: (packageUuid: string) => void;
}> = ({ packages, canUnassign, isUnassigning, onUnassign }) => (
  <div className="space-y-2">
    {packages.map((pkg) => (
      <div
        key={pkg.uuid}
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl"
      >
        <Package size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-bold text-slate-800 truncate" title={pkg.tracking_number}>{pkg.tracking_number}</p>
          <p className="text-[10px] text-slate-400 truncate">
            {Number(pkg.weight_lb).toFixed(2)} lb · {pkg.package_type}{pkg.store_name ? ` · ${pkg.store_name}` : ''}
          </p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg flex-shrink-0 whitespace-nowrap">
          {pkg.status}
        </span>
        {canUnassign && (
          <button
            onClick={() => onUnassign(pkg.uuid)}
            disabled={isUnassigning}
            title="Quitar de la orden de envío"
            className="p-2.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <X size={16} />
          </button>
        )}
      </div>
    ))}
  </div>
);

export default ShipmentOrderDetailContainer;
