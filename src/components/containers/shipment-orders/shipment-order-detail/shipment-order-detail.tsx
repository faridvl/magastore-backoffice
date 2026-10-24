import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  Package,
  X,
  FileText,
  CheckCircle,
  RotateCcw,
  SendHorizonal,
  MapPin,
  Square,
  CheckSquare,
  TrendingUp,
  Copy,
  Truck,
  Lock,
  Wallet,
  Banknote,
  Plus,
  Settings2,
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { BillingDetailModal } from '@/components/common/billing-detail-modal/billing-detail-modal';
import { PaymentMethodPicker } from '@/components/common/payment-method-picker/payment-method-picker';
import { CustomerTypeBadge } from '@/components/common/customer-type-badge/customer-type-badge';
import { CustomerBillingMode } from '@/types/customer/customer.types';
import { useShipmentOrderDetail, DetailConfirmAction } from './use-shipment-order-detail';
import { WizardStepsSection } from './step-sections/wizard-steps-section';
import { PostDeliverySection } from './step-sections/post-delivery-section';
import { CustomerAddressesModal } from '@/components/containers/customers/customer-detail/customer-addresses-modal';
import { CustomerRecipientsList } from '@/components/containers/customers/customer-recipients/customer-recipients-list';
import {
  ConsolidationStatus,
  ConsolidationPackage,
  ConsolidationDetail,
  AvailablePackage,
  ProfitShareStatus,
  ShipmentOrderStep,
} from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { formatCrc } from '@/shared/utils/format-crc';
import { packageStatusLabel, packageTypeLabel } from '@/shared/constants/package-labels';

const STATUS_LABELS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  DESPACHADO: 'En camino',
  ENTREGADO: 'Entregado',
};

const STATUS_COLORS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'bg-amber-50 text-amber-600 border-amber-100',
  CERRADO: 'bg-blue-50 text-blue-600 border-blue-100',
  DESPACHADO: 'bg-violet-50 text-violet-600 border-violet-100',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const formatCRC = formatCrc;

const CONFIRM_COPY: Record<DetailConfirmAction, { title: string; body: string; confirmLabel: string }> = {
  [DetailConfirmAction.GO_BACK]: {
    title: '¿Volver a Confirmación?',
    body: 'Se descarta el estimado. Si ya se lo enviaste al cliente, después tendrás que generarlo y enviarlo de nuevo.',
    confirmLabel: 'Sí, volver',
  },
  [DetailConfirmAction.UNASSIGN_PACKAGE]: {
    title: '¿Quitar este paquete de la orden?',
    body: 'El paquete vuelve a quedar disponible para otra orden del cliente.',
    confirmLabel: 'Sí, quitar',
  },
};

export const ShipmentOrderDetailContainer: React.FC = () => {
  const router = useRouter();
  const { uuid } = router.query;
  const resolvedUuid = router.isReady ? (uuid as string) : undefined;

  const {
    detail,
    isLoadingDetail,
    handleBack,
    backLabel,

    isUpdating,
    handleAdvanceToClosing, isAdvancingToClosing,
    isPickup,
    confirmAction, setConfirmAction, handleConfirmAction,
    showRecipientModal, setShowRecipientModal, handleOpenRecipientModal, handleSetRecipient,
    requestGoBackToConfirmation, requestUnassignPackage,
    quickActionTarget, setQuickActionTarget,
    handleConfirmQuickAction,
    handleAdvanceToDispatchClick,
    showPaymentCheckModal, setShowPaymentCheckModal,
    paymentCheckMethod, setPaymentCheckMethod,
    handleConfirmPaymentCheck,
    handleNotifyPaymentConfirmed, isNotifyingPaymentConfirmed,
    isAdvancingToDispatch,
    step1BlockedReason,

    showActualFeeModal, setShowActualFeeModal,
    actualFeeDraft, setActualFeeDraft,
    handleOpenActualFeeModal,
    handleSaveActualFee, isSavingActualFee,
    handleMarkChangeReturned, isMarkingChangeReturned,
    handleFinalizeOrder, isFinalizing,

    isUnassigning,

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
    billingDetail, isLoadingBillingDetail, isFetchingBillingDetail, retryBillingDetail,
    handleDownloadBillingPdf, isDownloadingBillingPdf,

    showAddressModal, setShowAddressModal,
    addressOptions,
    selectedAddressId, setSelectedAddressId,
    isLoadingAddresses,
    handleOpenAddressModal,
    handleConfirmAddressChange,
    isSavingAddress,
    showManageAddressesModal, setShowManageAddressesModal,
    handleManagedAddressesSaved,

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
  const isPaid = !!detail.billing_is_paid;
  const deliveryMethodEntity = deliveryMethodsData?.data.find((m) => m.code === detail.delivery_method);
  const isDispatched = detail.status === ConsolidationStatus.DESPACHADO || detail.status === ConsolidationStatus.ENTREGADO;
  // El aviso de despacho necesita las tres cosas: sin guía no hay qué rastrear,
  // y sin URL configurada el mensaje llevaría un enlace vacío.
  const canNotifyDispatch = isDispatched && !!detail.tracking_code && !!deliveryMethodEntity?.tracking_url;
  // "Agregar paquetes": en Confirmación y en Cobro (recalcula el estimado); no en
  // Despacho, donde el proveedor ya tiene la solicitud con la lista original.
  const canAssignPackages = detail.current_step === ShipmentOrderStep.CONFIRMACION || detail.current_step === ShipmentOrderStep.COBRO;
  const confirmCopy = confirmAction ? CONFIRM_COPY[confirmAction] : null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col min-w-0 w-full md:w-auto">
          {/* En móvil la flecha del header ya vuelve atrás. */}
          <button onClick={handleBack} className="hidden sm:flex items-center gap-1.5 min-h-[32px] text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold mb-2">
            <ChevronLeft size={16} /> {backLabel}
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
          <p className="text-slate-500 text-sm font-medium mt-1 break-words">
            {detail.customer_code} · {detail.customer_email.toLowerCase()}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1.5 rounded-full text-xs font-bold border ${STATUS_COLORS[detail.status]}`}>
            {isPickup && detail.status === ConsolidationStatus.DESPACHADO ? 'Listo para retiro' : STATUS_LABELS[detail.status]}
          </span>
          {hasBilling && (
            <button
              onClick={() => setShowBillingModal(true)}
              className="inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
            >
              <FileText size={14} />
              Ver factura
            </button>
          )}
        </div>
      </div>

      <WizardStepsSection
        detail={detail}
        deliveryMethodsData={deliveryMethodsData?.data}
        activeDeliveryMethods={activeDeliveryMethods}
        isPickup={isPickup}
        finalizedContent={
          <>
            <PostDeliverySection detail={detail} />
            {detail.packages.length > 0 && <ProfitCard detail={detail} />}
          </>
        }
        step1BlockedReason={step1BlockedReason}
        isGeneratingPreBilling={isGeneratingPreBilling}
        handleGenerateEstimateClick={handleGenerateEstimateClick}
        isConfirmingPreBilling={isConfirmingPreBilling}
        handleConfirmPreBilling={handleConfirmPreBilling}
        isNotifyingPreBilling={isNotifyingPreBilling}
        handleNotifyPreBilling={handleNotifyPreBilling}
        handleDownloadPreBillingPDF={handleDownloadPreBillingPDF}
        setPreBillingDeliveryMethod={setPreBillingDeliveryMethod}
        setShowPreBillingModal={setShowPreBillingModal}
        isUpdating={isUpdating}
        isAdvancingToDispatch={isAdvancingToDispatch}
        handleAdvanceToDispatchClick={handleAdvanceToDispatchClick}
        isAdvancingToClosing={isAdvancingToClosing}
        handleAdvanceToClosing={handleAdvanceToClosing}
        requestGoBackToConfirmation={requestGoBackToConfirmation}
        setShowBillingModal={setShowBillingModal}
        handleOpenShipmentRequestModal={handleOpenShipmentRequestModal}
        isCopyingRequest={isCopyingRequest}
        handleNotifyCustomerShipmentRequested={handleNotifyCustomerShipmentRequested}
        handleNotifyPaymentConfirmed={handleNotifyPaymentConfirmed}
        isNotifyingPaymentConfirmed={isNotifyingPaymentConfirmed}
        isNotifyingShipmentRequested={isNotifyingShipmentRequested}
        handleOpenTrackingModal={handleOpenTrackingModal}
        canNotifyDispatch={canNotifyDispatch}
        handleNotifyDispatch={handleNotifyDispatch}
        isNotifyingDispatch={isNotifyingDispatch}
        handleOpenActualFeeModal={handleOpenActualFeeModal}
        handleMarkChangeReturned={handleMarkChangeReturned}
        isMarkingChangeReturned={isMarkingChangeReturned}
        handleFinalizeOrder={handleFinalizeOrder}
        isFinalizing={isFinalizing}
        handleCopyAddressConfirmation={handleCopyAddressConfirmation}
        isCopyingAddressConfirmation={isCopyingAddressConfirmation}
        handleCopyAddressRequest={handleCopyAddressRequest}
        isCopyingAddressRequest={isCopyingAddressRequest}
        handleOpenAddressModal={handleOpenAddressModal}
        isLoadingAddresses={isLoadingAddresses}
        handleOpenMethodModal={handleOpenMethodModal}
        handleOpenRecipientModal={handleOpenRecipientModal}
        canAssignPackages={canAssignPackages}
        handleOpenAssignModal={handleOpenAssignModal}
        isLoadingAvailable={isLoadingAvailable}
        requestUnassignPackage={requestUnassignPackage}
        isUnassigning={isUnassigning}
      />

      {/* MODAL: QUIÉN RECIBE */}
      {showRecipientModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center sm:p-4"
          onClick={() => setShowRecipientModal(false)}
        >
          <div
            className="bg-white w-full sm:max-w-md rounded-t-[28px] sm:rounded-[28px] p-5 sm:p-6 shadow-2xl max-h-[88vh] overflow-y-auto animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-lg font-bold text-slate-900">¿Quién recibe?</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">Elige al cliente o a otra persona. Se usa en la solicitud al proveedor, la confirmación y la factura.</p>
            <CustomerRecipientsList
              customerId={detail.customer_id}
              customerName={detail.customer_name}
              selectedId={detail.recipient_id}
              onSelect={handleSetRecipient}
            />
            <button
              onClick={() => setShowRecipientModal(false)}
              className="w-full mt-4 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR UNA ACCIÓN QUE DESCARTA TRABAJO */}
      {confirmCopy && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setConfirmAction(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="font-bold text-slate-900 text-base">{confirmCopy.title}</p>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">{confirmCopy.body}</p>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setConfirmAction(null)}
                className="flex-1 min-h-[44px] rounded-xl border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAction}
                className="flex-1 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-800 transition-colors"
              >
                {confirmCopy.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DETALLE DE FACTURA (mismo modal que Facturación) */}
      {showBillingModal && (
        <BillingDetailModal
          billingDetail={billingDetail}
          isLoading={isLoadingBillingDetail}
          isRetrying={isFetchingBillingDetail}
          onRetry={retryBillingDetail}
          onClose={() => setShowBillingModal(false)}
          onMarkAsPaid={handleMarkAsPaid}
          isMarkingPaid={isMarkingPaid}
          onDownloadPdf={handleDownloadBillingPdf}
          isDownloadingPdf={isDownloadingBillingPdf}
        />
      )}

      {/* MODAL: ¿ESTÁ PAGADA? — salto paso 2 → paso 3. No bloquea: hay
          clientes a los que se les despacha sin haber pagado (caso confirmado
          por el dueño), así que "No" avanza igual y la orden queda visible en
          el filtro "Sin pagar" del listado. */}
      {showPaymentCheckModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPaymentCheckModal(false)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 rounded-xl bg-amber-50 flex-shrink-0">
                <Wallet size={18} className="text-amber-600" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">¿Esta orden ya está pagada?</p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  Antes de despachar, confirma si el cliente ya pagó. Si todavía no pagó, la orden
                  igual se puede despachar — quedará marcada como pendiente de pago.
                </p>
              </div>
            </div>
            <div className="mb-5">
              <PaymentMethodPicker
                value={paymentCheckMethod}
                onChange={setPaymentCheckMethod}
                disabled={isAdvancingToDispatch}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => handleConfirmPaymentCheck(false)}
                disabled={isAdvancingToDispatch}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-40"
              >
                Todavía no
              </button>
              <button
                onClick={() => handleConfirmPaymentCheck(true)}
                disabled={isAdvancingToDispatch || !paymentCheckMethod}
                title={paymentCheckMethod ? undefined : 'Elige el método de pago'}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 disabled:opacity-40"
              >
                <CheckCircle size={14} /> Sí, ya pagó
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: REABRIR — único disparador hoy es el botón "Reabrir" del
          modal de "edición bloqueada" (Cambiar dirección/método con estimado
          ya generado, visto desde el paso 1). El salto 2→3 (antes también
          pasaba por acá, con "¿Marcar como despachada?") ya no usa ningún
          modal: es directo y en silencio, pedido explícito del dueño — ver
          handleAdvanceToDispatchDirect en el hook. */}
      {quickActionTarget === 'reopen' && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setQuickActionTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 rounded-xl flex-shrink-0 bg-amber-50">
                <RotateCcw size={18} className="text-amber-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  ¿Volver a abrir esta orden de envío?
                </p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  {hasBilling
                    ? 'Se descarta la factura sin pagar. Después de editar, tendrás que generar y confirmar el estimado de nuevo.'
                    : hasPreBilling
                      ? 'Se descarta el estimado. Después de editar, tendrás que generarlo de nuevo.'
                      : 'Podrás seguir editándola.'}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setQuickActionTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmQuickAction}
                className="flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600"
              >
                <RotateCcw size={14} /> Reabrir
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
                Generar estimado
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
                {isGeneratingPreBilling ? 'Generando…' : 'Generar estimado'}
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
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
                  <MapPin size={18} className="text-slate-600" />
                </div>
                <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                  Dirección
                </Typography>
              </div>
              {addressOptions.length > 0 && (
                <button
                  onClick={() => setShowManageAddressesModal(true)}
                  className="flex items-center gap-1 px-3 min-h-[38px] bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all flex-shrink-0"
                >
                  <Settings2 size={12} />
                  Gestionar
                </button>
              )}
            </div>

            {addressOptions.length === 0 ? (
              <div className="text-center py-6 mb-6">
                <p className="text-slate-400 text-sm mb-4">Este cliente no tiene direcciones registradas.</p>
                <button
                  onClick={() => setShowManageAddressesModal(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all"
                >
                  <Plus size={14} />
                  Agregar dirección
                </button>
              </div>
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
                      <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Principal' : ''}</p>
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

      {/* Anidado sobre el selector de dirección, que ocupa z-[60]. */}
      {showManageAddressesModal && (
        <CustomerAddressesModal
          customerId={detail.customer_id}
          addresses={addressOptions}
          onSaved={handleManagedAddressesSaved}
          onClose={() => setShowManageAddressesModal(false)}
          zIndexClassName="z-[70]"
          startWithNewAddress={addressOptions.length === 0}
        />
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
              Datos de quien recibe, tomados de la dirección de entrega. Corrígelos si hace falta.
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Nombre de quien recibe</label>
                <input
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Teléfono</label>
                <input
                  value={receiverPhone}
                  onChange={(e) => setReceiverPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700"
                />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Cédula</label>
                <input
                  value={receiverIdCard}
                  onChange={(e) => setReceiverIdCard(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700"
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
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-base font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400 mb-2"
            />
            <p className="text-[11px] text-slate-400 mb-6">
              {deliveryMethodEntity?.tracking_url
                ? 'Con la guía cargada puedes enviarle al cliente el aviso de despacho.'
                : 'Este método no tiene enlace de rastreo. Agrégalo en Ajustes → Métodos de entrega para poder avisar al cliente.'}
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
                disabled={isSavingTracking || !trackingDraft.trim()}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isSavingTracking ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: COSTO REAL DE ENVÍO (paso 4) — ajusta solo lo cobrado al
          cliente (delivery_fee_crc/total_amount_crc), NO la ganancia
          registrada. Ver ConsolidationsRepository.setActualDeliveryFee. */}
      {showActualFeeModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowActualFeeModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-violet-50 rounded-xl">
                <Banknote size={18} className="text-violet-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Costo real de envío
              </Typography>
            </div>

            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
              Monto que cobró el transportista (₡)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={actualFeeDraft}
              onChange={(e) => setActualFeeDraft(e.target.value)}
              placeholder="Ej. 4200"
              className="w-full bg-white border border-slate-200 rounded-2xl px-4 py-3 text-base font-medium text-slate-700 outline-none focus:ring-2 focus:ring-violet-400/30 focus:border-violet-400 mb-2"
            />
            <p className="text-[11px] text-slate-400 mb-6">
              Esto corrige lo que se le cobró al cliente por el envío. Si se le cobró de más,
              se indicará un vuelto. No afecta la ganancia ya registrada de esta orden.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowActualFeeModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveActualFee}
                disabled={isSavingActualFee}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isSavingActualFee ? 'Guardando...' : 'Guardar'}
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
                    ? 'La factura ya tiene la dirección y la tarifa de entrega. Para cambiarlas, vuelve a abrir la orden: se descarta la factura y tendrás que generar el estimado de nuevo.'
                    : 'El estimado ya se calculó con estos datos. Para cambiarlos, vuelve a abrir la orden: se descarta el estimado y tendrás que generarlo de nuevo.'}
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
                  Agregar paquetes
                </Typography>
              </div>
              {selectedPackageUuids.length > 0 && (
                <span className="bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full">
                  {formatCount(selectedPackageUuids.length, 'seleccionado', 'seleccionados')}
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
                <p className="text-slate-400 text-xs mt-1">Los paquetes que ya están en otra orden no aparecen aquí.</p>
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
                          {formatWeight(pkg.weight_lb)} · {packageTypeLabel(pkg.package_type)} · {packageStatusLabel(pkg.status)}
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
  // Con el costo real cargado en el Cierre, el cobro total ya lo incluye: el
  // costo debe ser el mismo, si no cobro − costo deja de dar la ganancia.
  const deliveryCost = detail.billing_actual_delivery_fee_crc != null
    ? Number(detail.billing_actual_delivery_fee_crc)
    : detail.billing_delivery_cost_crc != null ? Number(detail.billing_delivery_cost_crc) : null;
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
              {formatWeight(pkg.weight_lb)}{pkg.store_name ? ` · ${pkg.store_name}` : ''}
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

export default ShipmentOrderDetailContainer;
