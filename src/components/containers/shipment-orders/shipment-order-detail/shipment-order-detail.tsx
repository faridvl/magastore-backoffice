import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import { useRouter } from 'next/router';
import {
  ChevronLeft,
  X,
  CheckCircle,
  RotateCcw,
  Square,
  CheckSquare,
  TrendingUp,
  Settings2,
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Modal } from '@/components/common/modal/modal';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { PAYMENT_METHOD_LABELS } from '@/shared/constants/payment-methods';
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
    retryDetail,
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
        <div className="mt-2 flex gap-3">
          <Button variant={ButtonVariant.PRIMARY} text="Reintentar" onClick={retryDetail} />
          <Button variant={ButtonVariant.CANCEL} text="Volver al listado" onClick={handleBack} />
        </div>
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
  const isActualFeeValid = actualFeeDraft.trim() !== '' && Number(actualFeeDraft) >= 0;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pb-20">
      {/* HEADER */}
      <div className="flex flex-col min-w-0">
        {/* En móvil la flecha del header ya vuelve atrás. */}
        <button onClick={handleBack} className="hidden sm:flex items-center gap-1.5 min-h-[44px] self-start text-slate-500 hover:text-slate-900 transition-colors text-sm font-semibold">
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
        <Modal
          title="¿Quién recibe?"
          subtitle="Elige quién recibe este envío."
          onClose={() => setShowRecipientModal(false)}
          footer={<Button variant={ButtonVariant.CANCEL} text="Cerrar" onClick={() => setShowRecipientModal(false)} className="w-full" />}
        >
          <CustomerRecipientsList
            customerId={detail.customer_id}
            customerName={detail.customer_name}
            selectedId={detail.recipient_id}
            onSelect={handleSetRecipient}
          />
        </Modal>
      )}

      {/* MODAL: CONFIRMAR UNA ACCIÓN QUE DESCARTA TRABAJO */}
      {confirmCopy && (
        <Modal
          title={confirmCopy.title}
          onClose={() => setConfirmAction(null)}
          className="sm:max-w-sm"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setConfirmAction(null)} className="flex-1" />
              <Button variant={ButtonVariant.PRIMARY} text={confirmCopy.confirmLabel} onClick={handleConfirmAction} className="flex-1" />
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-slate-500">{confirmCopy.body}</p>
        </Modal>
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
          por el dueño), así que "Todavía no" avanza igual y la orden queda
          visible en el filtro "Sin pagar" del listado. */}
      {showPaymentCheckModal && (
        <Modal
          title="¿Esta orden ya está pagada?"
          subtitle="Si todavía no pagó, la orden igual se puede despachar y queda como por cobrar."
          onClose={() => setShowPaymentCheckModal(false)}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button
                variant={ButtonVariant.CANCEL}
                text="Todavía no"
                onClick={() => handleConfirmPaymentCheck(false)}
                disabled={isAdvancingToDispatch}
                className="flex-1"
              />
              <Button
                variant={ButtonVariant.SUCCESS}
                onClick={() => handleConfirmPaymentCheck(true)}
                disabled={isAdvancingToDispatch || !paymentCheckMethod}
                className="flex-1"
              >
                <CheckCircle size={16} /> Sí, ya pagó
              </Button>
            </div>
          }
        >
          <PaymentMethodPicker
            value={paymentCheckMethod}
            onChange={setPaymentCheckMethod}
            disabled={isAdvancingToDispatch}
            label={paymentCheckMethod ? `Pagó con ${PAYMENT_METHOD_LABELS[paymentCheckMethod]}` : 'Elige cómo pagó para marcarla pagada'}
          />
        </Modal>
      )}

      {/* MODAL: REABRIR — único disparador hoy es el botón "Reabrir" del
          modal de "edición bloqueada" (Cambiar dirección/método con estimado
          ya generado, visto desde el paso 1). El salto 2→3 no usa ningún
          modal: es directo y en silencio, pedido explícito del dueño — ver
          handleAdvanceToDispatchDirect en el hook. */}
      {quickActionTarget === 'reopen' && (
        <Modal
          title="¿Volver a abrir esta orden?"
          onClose={() => setQuickActionTarget(null)}
          className="sm:max-w-sm"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setQuickActionTarget(null)} className="flex-1" />
              <Button variant={ButtonVariant.ALERT} onClick={handleConfirmQuickAction} className="flex-1">
                <RotateCcw size={16} /> Reabrir
              </Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-slate-500">
            {hasBilling
              ? 'Se descarta la factura sin pagar. Después de editar, tendrás que generar y confirmar el estimado de nuevo.'
              : hasPreBilling
                ? 'Se descarta el estimado. Después de editar, tendrás que generarlo de nuevo.'
                : 'Podrás seguir editándola.'}
          </p>
        </Modal>
      )}

      {/* MODAL: GENERAR ESTIMADO */}
      {showPreBillingModal && (
        <Modal
          title="Generar estimado"
          onClose={() => setShowPreBillingModal(false)}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowPreBillingModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isGeneratingPreBilling ? 'Generando…' : 'Generar estimado'}
                onClick={handleGeneratePreBilling}
                disabled={isGeneratingPreBilling || !preBillingDeliveryMethod}
                className="flex-1"
              />
            </div>
          }
        >
          <p className="mb-2 text-xs font-bold text-slate-500">Método de entrega</p>
          <div className="space-y-2">
            {activeDeliveryMethods.map((dm) => (
              <ChoiceRow key={dm.code} isSelected={preBillingDeliveryMethod === dm.code} onClick={() => setPreBillingDeliveryMethod(dm.code)}>
                <span className="font-bold text-sm">{dm.name}</span>
              </ChoiceRow>
            ))}
          </div>
        </Modal>
      )}

      {/* MODAL: CAMBIAR DIRECCIÓN DE ENTREGA */}
      {showAddressModal && (
        <Modal
          title="Dirección de entrega"
          onClose={() => setShowAddressModal(false)}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowAddressModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isSavingAddress ? 'Guardando…' : 'Guardar'}
                onClick={handleConfirmAddressChange}
                disabled={!selectedAddressId || isSavingAddress}
                className="flex-1"
              />
            </div>
          }
        >
          {addressOptions.length === 0 ? (
            <EmptyState
              title="Aún no tiene direcciones"
              actionLabel="Agregar dirección"
              onAction={() => setShowManageAddressesModal(true)}
              className="py-6"
            />
          ) : (
            <>
              <div className="mb-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowManageAddressesModal(true)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-800"
                >
                  <Settings2 size={14} /> Gestionar direcciones
                </button>
              </div>
              <div className="space-y-2">
                {addressOptions.map((addr) => (
                  <ChoiceRow key={addr.id} isSelected={selectedAddressId === addr.id} onClick={() => setSelectedAddressId(addr.id)}>
                    <div className="min-w-0">
                      <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Principal' : ''}</p>
                      <p className={`mt-0.5 break-words text-xs ${selectedAddressId === addr.id ? 'text-slate-300' : 'text-slate-500'}`}>
                        {addr.exact_address}, {addr.district}, {addr.canton}, {addr.province}
                      </p>
                    </div>
                  </ChoiceRow>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Anidado sobre el selector de dirección: el Modal común apila el último encima. */}
      {showManageAddressesModal && (
        <CustomerAddressesModal
          customerId={detail.customer_id}
          addresses={addressOptions}
          onSaved={handleManagedAddressesSaved}
          onClose={() => setShowManageAddressesModal(false)}
          startWithNewAddress={addressOptions.length === 0}
        />
      )}

      {/* MODAL: CAMBIAR MÉTODO DE ENTREGA */}
      {showMethodModal && (
        <Modal
          title="Cambiar método de entrega"
          onClose={() => setShowMethodModal(false)}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowMethodModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isSavingMethod ? 'Guardando…' : 'Guardar'}
                onClick={handleConfirmMethodChange}
                disabled={!selectedMethod || isSavingMethod}
                className="flex-1"
              />
            </div>
          }
        >
          <div className="space-y-2">
            {activeDeliveryMethods.map((dm) => (
              <ChoiceRow key={dm.code} isSelected={selectedMethod === dm.code} onClick={() => setSelectedMethod(dm.code)}>
                <span className="font-bold text-sm">{dm.name}</span>
              </ChoiceRow>
            ))}
          </div>
        </Modal>
      )}

      {/* MODAL: SOLICITUD AL PROVEEDOR — permite corregir a quién se entrega
          antes de copiar, para los envíos que van a un tercero. Los datos no se
          guardan: viven solo mientras el modal está abierto. */}
      {showShipmentRequestModal && (
        <Modal
          title="Solicitud al proveedor"
          subtitle="Datos de quien recibe, tomados de la dirección de entrega. Corrígelos si hace falta."
          onClose={() => setShowShipmentRequestModal(false)}
          closeOnOverlayClick={false}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowShipmentRequestModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isCopyingRequest ? 'Copiando…' : 'Copiar solicitud'}
                onClick={handleCopyShipmentRequest}
                disabled={isCopyingRequest}
                className="flex-1"
              />
            </div>
          }
        >
          <div className="space-y-3">
            <label className="block">
              <span className="ml-1 text-xs font-bold text-slate-500">Nombre de quien recibe</span>
              <input value={receiverName} onChange={(e) => setReceiverName(e.target.value)} className={MODAL_INPUT_CLASS} />
            </label>
            <label className="block">
              <span className="ml-1 text-xs font-bold text-slate-500">Teléfono</span>
              <input value={receiverPhone} onChange={(e) => setReceiverPhone(e.target.value)} className={MODAL_INPUT_CLASS} />
            </label>
            <label className="block">
              <span className="ml-1 text-xs font-bold text-slate-500">Cédula</span>
              <input value={receiverIdCard} onChange={(e) => setReceiverIdCard(e.target.value)} className={MODAL_INPUT_CLASS} />
            </label>
          </div>
        </Modal>
      )}

      {/* MODAL: GUÍA DE RASTREO (registrar o corregir tras el despacho) */}
      {showTrackingModal && (
        <Modal
          title="Guía de rastreo"
          onClose={() => setShowTrackingModal(false)}
          closeOnOverlayClick={false}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowTrackingModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isSavingTracking ? 'Guardando…' : 'Guardar'}
                onClick={handleSaveTrackingCode}
                disabled={isSavingTracking || !trackingDraft.trim()}
                className="flex-1"
              />
            </div>
          }
        >
          <input
            type="text"
            value={trackingDraft}
            onChange={(e) => setTrackingDraft(e.target.value)}
            placeholder="Ej. EZ292332205CR"
            className={MODAL_INPUT_CLASS}
          />
          <p className="mt-2 text-xs text-slate-500">
            {deliveryMethodEntity?.tracking_url
              ? 'Con la guía cargada puedes enviarle al cliente el aviso de despacho.'
              : 'Este método no tiene enlace de rastreo. Agrégalo en Ajustes → Métodos de entrega para poder avisar al cliente.'}
          </p>
        </Modal>
      )}

      {/* MODAL: COSTO REAL DE ENVÍO (paso 4) — ajusta solo lo cobrado al
          cliente (delivery_fee_crc/total_amount_crc), NO la ganancia
          registrada. Ver ConsolidationsRepository.setActualDeliveryFee. */}
      {showActualFeeModal && (
        <Modal
          title="Costo real del envío"
          subtitle="Lo que cobró el transportista. Si es menos, se indica el vuelto."
          onClose={() => setShowActualFeeModal(false)}
          closeOnOverlayClick={false}
          className="sm:max-w-md"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowActualFeeModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isSavingActualFee ? 'Guardando…' : 'Guardar'}
                onClick={handleSaveActualFee}
                disabled={isSavingActualFee || !isActualFeeValid}
                className="flex-1"
              />
            </div>
          }
        >
          <label className="block">
            <span className="ml-1 text-xs font-bold text-slate-500">Monto que cobró el transportista (₡)</span>
            <input
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={actualFeeDraft}
              onChange={(e) => setActualFeeDraft(e.target.value)}
              placeholder="Ej. 4200"
              className={MODAL_INPUT_CLASS}
            />
          </label>
          <p className="mt-2 text-xs text-slate-500">La ganancia ya registrada de esta orden no cambia.</p>
        </Modal>
      )}

      {/* MODAL: EDICIÓN BLOQUEADA — explica por qué hay que reabrir en vez de
          dejar el botón inerte o escondido. */}
      {lockedEditTarget && (
        <Modal
          title={lockedEditTarget === 'address' ? 'La dirección ya no se puede cambiar' : 'El método de entrega ya no se puede cambiar'}
          onClose={() => setLockedEditTarget(null)}
          className="sm:max-w-sm"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Entendido" onClick={() => setLockedEditTarget(null)} className="flex-1" />
              {detail.status === ConsolidationStatus.CERRADO && !isPaid && (
                <Button
                  variant={ButtonVariant.ALERT}
                  onClick={() => {
                    setLockedEditTarget(null);
                    setQuickActionTarget('reopen');
                  }}
                  className="flex-1"
                >
                  <RotateCcw size={16} /> Reabrir
                </Button>
              )}
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-slate-500">
            {hasBilling
              ? 'La factura ya tiene la dirección y la tarifa de entrega. Para cambiarlas, vuelve a abrir la orden: se descarta la factura y tendrás que generar el estimado de nuevo.'
              : 'El estimado ya se calculó con estos datos. Para cambiarlos, vuelve a abrir la orden: se descarta el estimado y tendrás que generarlo de nuevo.'}
          </p>
        </Modal>
      )}

      {/* MODAL: AGREGAR PAQUETES */}
      {showAssignModal && (
        <Modal
          title="Agregar paquetes"
          subtitle={selectedPackageUuids.length > 0 ? formatCount(selectedPackageUuids.length, 'seleccionado', 'seleccionados') : undefined}
          onClose={() => setShowAssignModal(false)}
          footer={
            !isLoadingAvailable && availablePackages.length === 0 ? (
              <Button variant={ButtonVariant.CANCEL} text="Cerrar" onClick={() => setShowAssignModal(false)} className="w-full" />
            ) : (
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setShowAssignModal(false)} className="flex-1" />
              <Button
                variant={ButtonVariant.PRIMARY}
                text={isAssigning ? 'Agregando…' : `Agregar${selectedPackageUuids.length > 0 ? ` ${selectedPackageUuids.length}` : ''}`}
                onClick={handleConfirmAssign}
                disabled={selectedPackageUuids.length === 0 || isAssigning}
                className="flex-1"
              />
            </div>
            )
          }
        >
          {isLoadingAvailable ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-800" />
            </div>
          ) : availablePackages.length === 0 ? (
            <div>
              <EmptyState title="No hay paquetes disponibles" className="pb-2 pt-6" />
              <p className="pb-4 text-center text-xs text-slate-500">Los paquetes que ya están en otra orden no aparecen aquí.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {availablePackages.map((pkg: AvailablePackage) => {
                const selected = selectedPackageUuids.includes(pkg.uuid);
                return (
                  <button
                    key={pkg.uuid}
                    type="button"
                    onClick={() => handleTogglePackage(pkg.uuid)}
                    className={`flex min-h-[44px] w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
                      selected ? 'border-amber-200 bg-amber-50' : 'border-transparent bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    {selected
                      ? <CheckSquare size={18} className="flex-shrink-0 text-amber-600" />
                      : <Square size={18} className="flex-shrink-0 text-slate-300" />}
                    <div className="min-w-0 flex-1">
                      <p className="font-mono text-sm font-bold text-slate-800 [overflow-wrap:anywhere]">
                        {pkg.tracking_number}{pkg.store_name ? ` — ${pkg.store_name}` : ''}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatWeight(pkg.weight_lb)} · {packageTypeLabel(pkg.package_type)} · {packageStatusLabel(pkg.status)}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
};

const MODAL_INPUT_CLASS =
  'mt-1 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base font-medium text-slate-700 outline-none focus:border-teal-700 focus:ring-2 focus:ring-teal-700/20';

/** Opción elegible de una lista dentro de un modal (dirección, método de entrega). */
const ChoiceRow: React.FC<{ isSelected: boolean; onClick: () => void; children: React.ReactNode }> = ({ isSelected, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex min-h-[44px] w-full items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${
      isSelected
        ? 'border-slate-900 bg-slate-900 text-white'
        : 'border-transparent bg-slate-50 text-slate-700 hover:border-slate-200'
    }`}
  >
    {children}
    {isSelected && <CheckCircle size={16} className="flex-shrink-0 text-amber-400" />}
  </button>
);

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
          <p className="text-xs font-bold text-slate-500">
            Rentabilidad · solo interno
          </p>
        </div>
        <span className="text-xs font-semibold text-emerald-700">
          Ganancia facturada
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="px-4 py-3 bg-slate-50 rounded-2xl">
          <p className="text-xs font-bold text-slate-500">Costo courier</p>
          <p className="text-xs font-bold text-slate-700">{courierCost != null ? formatCRC(courierCost) : '—'}</p>
        </div>
        <div className="px-4 py-3 bg-slate-50 rounded-2xl">
          <p className="text-xs font-bold text-slate-500">Costo entrega</p>
          <p className="text-xs font-bold text-slate-700">
            {deliveryCost != null ? formatCRC(deliveryCost) : <span className="text-slate-400 italic font-medium">Sin dato al facturar</span>}
          </p>
        </div>
      </div>

      <div className="bg-slate-900 rounded-2xl px-5 py-4 grid grid-cols-3 gap-2">
        <div>
          <p className="text-xs font-bold text-slate-400">Cobro total</p>
          <p className="text-sm font-black text-white">{formatCRC(cobroTotal)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">Costo total</p>
          <p className="text-sm font-black text-white">
            {formatCRC((courierCost ?? 0) + (deliveryCost ?? 0))}{hasUnknownCost ? ' *' : ''}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">Ganancia</p>
          <p className={`text-sm font-black ${gananciaTotal != null && gananciaTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {gananciaTotal != null ? formatCRC(gananciaTotal) : '—'}
            {margen != null && <span className="text-xs font-bold text-slate-400 ml-1.5">{margen.toFixed(0)}%</span>}
          </p>
        </div>
      </div>

      <ProfitShareRow detail={detail} />

      {hasUnknownCost && (
        <p className="mt-3 text-xs text-amber-700">
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
        <p className="text-xs font-bold text-violet-700">
          Farid{percent != null ? ` · ${percent}%` : ''}
          {isEstimated && <span className="ml-1 text-slate-400">(provisional)</span>}
        </p>
        <p className="text-sm font-black text-violet-700">{formatCRC(share)}</p>
      </div>
      {neto != null && (
        <div className="text-right">
          <p className="text-xs font-bold text-slate-500">Neto Magastore</p>
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
          <p className="text-xs font-bold text-slate-500">
            Rentabilidad · solo interno
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* La regla de cobro explica por qué el margen no es el de lista. */}
          {billingMode !== CustomerBillingMode.NORMAL && (
            <CustomerTypeBadge
              name={detail.customer_type_name ?? 'Tipo especial'}
              mode={billingMode as CustomerBillingMode}
              discount={discountPercent}
            />
          )}
          <span className="text-xs font-semibold text-slate-500">
            {usingSnapshot ? 'Tarifas del estimado' : 'Tarifas vigentes (sin estimado aún)'}
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {rows.map(({ pkg, cobro, costo, ganancia }) => (
          <div key={pkg.uuid} className="px-4 py-3 bg-slate-50 rounded-2xl min-w-0">
            <p className="font-mono text-sm font-bold text-slate-800 truncate" title={pkg.tracking_number}>{pkg.tracking_number}</p>
            <p className="text-xs text-slate-500 mb-2 truncate">
              {formatWeight(pkg.weight_lb)}{pkg.store_name ? ` · ${pkg.store_name}` : ''}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs font-bold text-slate-500">Cobro</p>
                <p className="text-xs font-bold text-slate-700">{formatCRC(cobro)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Costo real</p>
                <p className="text-xs font-bold text-slate-700">
                  {costo != null ? formatCRC(costo) : <span className="text-slate-400 italic font-medium">Sin datos</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Ganancia</p>
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
            <p className="text-xs text-slate-500 mb-2">
              {detail.pre_billing_fee_crc != null ? 'Cobro del estimado' : 'Cobro con tarifa vigente'}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <p className="text-xs font-bold text-slate-500">Cobro</p>
                <p className="text-xs font-bold text-slate-700">{formatCRC(deliveryFee)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Costo real</p>
                <p className="text-xs font-bold text-slate-700">
                  {deliveryCost != null ? formatCRC(deliveryCost) : <span className="text-slate-400 italic font-medium">Por confirmar</span>}
                </p>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500">Ganancia</p>
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
          <p className="text-xs font-bold text-slate-400">Cobro total</p>
          <p className="text-sm font-black text-white">{formatCRC(cobroTotal)}</p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">Costo total</p>
          <p className="text-sm font-black text-white">
            {formatCRC(costoTotal)}{missingCost || missingDeliveryCost ? ' *' : ''}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400">Ganancia</p>
          <p className={`text-sm font-black ${gananciaTotal >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCRC(gananciaTotal)}
            <span className="text-xs font-bold text-slate-400 ml-1.5">{margen.toFixed(0)}%</span>
          </p>
        </div>
      </div>

      <ProfitShareRow detail={detail} profitOverride={gananciaTotal} />

      <div className="mt-3 space-y-0.5">
        {missingCost && (
          <p className="text-xs text-amber-700">
            * Ganancia parcial: hay paquetes registrados sin costo de courier o sin tipo de cambio del banco.
          </p>
        )}
        {missingDeliveryCost && (
          <p className="text-xs text-amber-700">
            * El costo real de la entrega está por confirmar en la tarifa de {resolveDeliveryMethodLabel(deliveryMethod, deliveryMethodsData?.data)} — no se incluye en el costo total.
          </p>
        )}
        {minApplied && (
          <p className="text-xs text-slate-500">
            El cobro total incluye el ajuste por peso mínimo ({Number(detail.current_min_weight)} lb), por eso puede superar la suma por paquete.
          </p>
        )}
        <p className="text-xs text-slate-500">
          No incluye el fee de entrega (Correos/Tracopa), que es un traslado de costo. Este cálculo no aparece en el estimado ni en la factura del cliente.
        </p>
      </div>
    </div>
  );
};

export default ShipmentOrderDetailContainer;
