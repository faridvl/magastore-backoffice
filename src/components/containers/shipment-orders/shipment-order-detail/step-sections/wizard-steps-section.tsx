import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import { Check, Plus, AlertCircle } from 'lucide-react';
import { ConsolidationStatus, ConsolidationDetail, ConsolidationPaymentStatus, ShipmentOrderStep, DeliveryMethod, DeliveryMethodEntity } from '@/types/logistics/logistics.types';
import { resolveZone } from '@/shared/constants/costa-rica-locations';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { formatCrc } from '@/shared/utils/format-crc';
import { formatBusinessDate } from '@/shared/utils/timezone';
import { Badge } from '@/components/common/badge/badge';
import { PAYMENT_STATUS_LABEL, PAYMENT_STATUS_TONE, getPaymentStatus } from '@/shared/constants/status-labels';
import { PackageTable } from './package-table';
import { OrderSummaryCard } from './order-summary-card';
import { FinalizedSummary } from './finalized-summary';
import { StepAction, StepActionVariant, ChecklistRow, StepCard, StepFooter } from './step-ui';
import { ESTIMATE_ROW_ANCHOR } from '@/shared/constants/operations';

// Finalizada (5) no se dibuja en la línea: ahí la pantalla pasa a postventa.
const STEP_ITEMS: { step: ShipmentOrderStep; label: string }[] = [
  { step: ShipmentOrderStep.CONFIRMACION, label: 'Confirmación' },
  { step: ShipmentOrderStep.COBRO, label: 'Cobro' },
  { step: ShipmentOrderStep.DESPACHO, label: 'Despacho' },
  { step: ShipmentOrderStep.NOTIFICACION, label: 'Cierre' },
];
const STEP_COUNT = STEP_ITEMS.length;
const NO_PACKAGES_HINT = 'La orden no tiene paquetes: no se puede avanzar.';

export interface WizardStepsSectionProps {
  detail: ConsolidationDetail;
  deliveryMethodsData: DeliveryMethodEntity[] | undefined;
  activeDeliveryMethods: DeliveryMethodEntity[];
  isPickup: boolean;
  // Lo que se muestra en lugar del paso cuando la orden está finalizada.
  finalizedContent: React.ReactNode;

  step1BlockedReason: string | null;
  isGeneratingPreBilling: boolean;
  handleGenerateEstimateClick: () => void;

  isConfirmingPreBilling: boolean;
  handleConfirmPreBilling: () => void;
  isNotifyingPreBilling: boolean;
  handleNotifyPreBilling: () => void;
  handleDownloadPreBillingPDF: (preBillingUuid: string, customerCode: string) => void;
  setPreBillingDeliveryMethod: (m: DeliveryMethod) => void;
  setShowPreBillingModal: (v: boolean) => void;

  isUpdating: boolean;
  isAdvancingToDispatch: boolean;
  handleAdvanceToDispatchClick: () => void;
  isAdvancingToClosing: boolean;
  handleAdvanceToClosing: () => void;
  requestGoBackToConfirmation: () => void;
  setShowBillingModal: (v: boolean) => void;

  handleOpenShipmentRequestModal: () => void;
  isCopyingRequest: boolean;
  handleNotifyCustomerShipmentRequested: () => void;
  isNotifyingShipmentRequested: boolean;
  handleNotifyPaymentConfirmed: () => void;
  isNotifyingPaymentConfirmed: boolean;
  handleOpenTrackingModal: () => void;

  canNotifyDispatch: boolean;
  handleNotifyDispatch: () => void;
  isNotifyingDispatch: boolean;
  handleOpenActualFeeModal: () => void;
  handleMarkChangeReturned: () => void;
  isMarkingChangeReturned: boolean;
  handleFinalizeOrder: () => void;
  isFinalizing: boolean;

  handleCopyAddressConfirmation: () => void;
  isCopyingAddressConfirmation: boolean;
  handleCopyAddressRequest: () => void;
  isCopyingAddressRequest: boolean;
  handleOpenAddressModal: () => void;
  isLoadingAddresses: boolean;
  handleOpenMethodModal: () => void;
  handleOpenRecipientModal: () => void;

  canAssignPackages: boolean;
  handleOpenAssignModal: () => void;
  isLoadingAvailable: boolean;
  requestUnassignPackage: (packageUuid: string) => void;
  isUnassigning: boolean;
}

const StatTile: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-2 py-3 sm:p-4 text-center min-w-0">
    <p className="text-xs font-bold text-slate-500">{label}</p>
    <div className="font-extrabold text-slate-800 text-base sm:text-lg mt-0.5 break-words">{children}</div>
  </div>
);

const Stepper: React.FC<{ currentStep: ShipmentOrderStep }> = ({ currentStep }) => (
  <ol className="flex items-center bg-white rounded-[2rem] border border-slate-100 shadow-sm px-4 py-4 sm:px-6">
    {STEP_ITEMS.map((item, idx) => {
      const isCompleted = currentStep > item.step;
      const isActive = currentStep === item.step;
      return (
        <React.Fragment key={item.step}>
          <li className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <span
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black border-2 ${
                isCompleted
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : isActive
                    ? 'bg-slate-900 border-slate-900 text-white'
                    : 'bg-white border-slate-200 text-slate-400'
              }`}
            >
              {isCompleted ? <Check size={16} /> : item.step}
            </span>
            <span className={`text-xs font-semibold whitespace-nowrap ${isActive ? 'text-slate-900' : isCompleted ? 'text-emerald-700' : 'text-slate-400'}`}>
              {item.label}
            </span>
          </li>
          {idx < STEP_ITEMS.length - 1 && (
            <li aria-hidden className={`flex-1 h-0.5 mx-2 mb-5 rounded-full ${currentStep > item.step ? 'bg-emerald-500' : 'bg-slate-100'}`} />
          )}
        </React.Fragment>
      );
    })}
  </ol>
);

/**
 * Detalle de la orden por pasos: se ve solo el paso activo, como lista de
 * tareas con su estado y una única acción principal al pie. El resumen de la
 * orden queda al costado en escritorio para consultar lo ya definido sin
 * tener que ver los otros pasos.
 */
export const WizardStepsSection: React.FC<WizardStepsSectionProps> = (props) => {
  const { detail, deliveryMethodsData, activeDeliveryMethods, isPickup } = props;

  const hasBilling = !!detail.billing_uuid;
  const hasPreBilling = !!detail.pre_billing_uuid;
  const preBillingConfirmed = !!detail.pre_billing_confirmed;
  const isPaid = !!detail.billing_is_paid;
  const amountToShow = detail.billing_total_amount_crc ?? detail.pre_billing_amount;
  const isFinalized = detail.current_step === ShipmentOrderStep.FINALIZADA;
  const hasAddress = !!detail.delivery_exact_address;
  const totalWeight = formatWeight(detail.total_weight_lb);
  const hasNoPackages = detail.packages.length === 0;
  const paymentStatus = getPaymentStatus({
    isBilled: hasBilling,
    isPaid,
    hasPreBilling,
    preBillingNotifiedAt: detail.pre_billing_notified_at,
  });

  const hasActualFee = detail.billing_actual_delivery_fee_crc != null;
  const originalFeeCrc = detail.billing_original_delivery_fee_crc ?? detail.billing_delivery_fee_crc;
  const changeCrc = hasActualFee && originalFeeCrc != null
    ? Number(originalFeeCrc) - Number(detail.billing_actual_delivery_fee_crc)
    : 0;
  const hasChangeDue = hasActualFee && changeCrc > 0;
  const stepLabel = (step: ShipmentOrderStep) => `Paso ${step} de ${STEP_COUNT}`;

  const renderConfirmation = () => (
    <StepCard
      stepLabel={stepLabel(ShipmentOrderStep.CONFIRMACION)}
      title="Confirmación"
      description={isPickup ? 'El cliente retira en oficina.' : undefined}
      footer={
        <StepFooter
          hint={hasNoPackages ? NO_PACKAGES_HINT : props.step1BlockedReason}
          next={
            <StepAction
              variant={StepActionVariant.PRIMARY}
              onClick={props.handleGenerateEstimateClick}
              disabled={detail.packages.length === 0 || props.isGeneratingPreBilling || !!props.step1BlockedReason}
            >
              {props.isGeneratingPreBilling ? 'Generando…' : 'Generar estimado'}
            </StepAction>
          }
        />
      }
    >
      {isPickup ? (
        <ChecklistRow title="Dirección de entrega" isDone>
          No hace falta
        </ChecklistRow>
      ) : (
        <ChecklistRow
          title="Dirección de entrega"
          isDone={hasAddress}
          action={
            <>
              {hasAddress ? (
                <StepAction onClick={props.handleCopyAddressConfirmation} disabled={props.isCopyingAddressConfirmation}>
                  Copiar confirmación
                </StepAction>
              ) : (
                <StepAction onClick={props.handleCopyAddressRequest} disabled={props.isCopyingAddressRequest}>
                  Pedir al cliente
                </StepAction>
              )}
              <StepAction onClick={props.handleOpenAddressModal} disabled={props.isLoadingAddresses}>
                {hasAddress ? 'Cambiar' : 'Registrar'}
              </StepAction>
            </>
          }
        >
          {hasAddress ? (
            <>
              <p className="text-slate-700 font-semibold">{detail.delivery_address_label || 'Dirección'}</p>
              <p>
                {detail.delivery_exact_address}, {detail.delivery_district}, {detail.delivery_canton}, {detail.delivery_province}
                {detail.delivery_canton ? ` · Zona ${resolveZone(detail.delivery_canton)}` : ''}
              </p>
            </>
          ) : (
            'Sin dirección'
          )}
        </ChecklistRow>
      )}
      {!isPickup && (
        <ChecklistRow
          title="Quién recibe"
          isDone
          action={<StepAction onClick={props.handleOpenRecipientModal}>Cambiar</StepAction>}
        >
          {detail.delivery_recipient_name
            ? [detail.delivery_recipient_name, detail.delivery_recipient_phone].filter(Boolean).join(' · ')
            : `El cliente (${detail.customer_name})`}
        </ChecklistRow>
      )}
      <ChecklistRow
        title="Método de entrega"
        isDone={!!detail.delivery_method}
        action={<StepAction onClick={props.handleOpenMethodModal}>Cambiar</StepAction>}
      >
        {detail.delivery_method
          ? resolveDeliveryMethodLabel(detail.delivery_method, deliveryMethodsData)
          : 'Sin elegir'}
      </ChecklistRow>
      <ChecklistRow title="Paquetes" isDone={detail.packages.length > 0}>
        {formatCount(detail.packages.length, 'paquete', 'paquetes')} · {totalWeight}
      </ChecklistRow>
    </StepCard>
  );

  const renderCobro = () => {
    const notifyRow = (
      <ChecklistRow
        id={ESTIMATE_ROW_ANCHOR}
        title="Estimado al cliente"
        isDone={!!detail.pre_billing_notified_at}
        action={
          <StepAction onClick={props.handleNotifyPreBilling} disabled={props.isNotifyingPreBilling}>
            {detail.pre_billing_notified_at ? 'Reenviar' : 'Enviar por WhatsApp'}
          </StepAction>
        }
      >
        {detail.pre_billing_notified_at
          ? `Enviado el ${formatBusinessDate(detail.pre_billing_notified_at)}`
          : 'Sin enviar'}
      </ChecklistRow>
    );
    const pdfAction = (
      <StepAction onClick={() => props.handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}>
        Descargar PDF
      </StepAction>
    );
    const backLink = (
      <StepAction variant={StepActionVariant.LINK} className="min-w-[44px]" onClick={props.requestGoBackToConfirmation} disabled={props.isUpdating}>
        Atrás
      </StepAction>
    );

    if (hasBilling) {
      return (
        <StepCard
          stepLabel={stepLabel(ShipmentOrderStep.COBRO)}
          title="Cobro"
          footer={
            <StepFooter
              back={!isPaid ? backLink : undefined}
              hint={hasNoPackages ? NO_PACKAGES_HINT : !isPaid ? 'Sin pago, se despacha como por cobrar.' : null}
              next={
                <StepAction
                  variant={StepActionVariant.PRIMARY}
                  onClick={props.handleAdvanceToDispatchClick}
                  disabled={props.isUpdating || props.isAdvancingToDispatch || hasNoPackages}
                >
                  {props.isAdvancingToDispatch ? 'Pasando…' : 'Pasar a despacho'}
                </StepAction>
              }
            />
          }
        >
          <ChecklistRow
            title="Factura"
            isDone={isPaid}
            action={
              <>
                <StepAction onClick={() => props.setShowBillingModal(true)}>Ver factura</StepAction>
                {detail.pre_billing_uuid && pdfAction}
              </>
            }
          >
            <span className="text-lg font-extrabold text-slate-900">{formatCrc(Number(detail.billing_total_amount_crc ?? 0))}</span>
            <span className={`ml-2 ${isPaid ? 'text-emerald-700' : 'text-amber-700'}`}>{PAYMENT_STATUS_LABEL[paymentStatus]}</span>
          </ChecklistRow>
          {detail.pre_billing_uuid && notifyRow}
        </StepCard>
      );
    }

    if (preBillingConfirmed) {
      // Estimado confirmado sin factura: datos viejos o inconsistentes. La única
      // salida sana es volver a Confirmación y generarlo de nuevo.
      return (
        <StepCard
          stepLabel={stepLabel(ShipmentOrderStep.COBRO)}
          title="Cobro"
          footer={<StepFooter back={backLink} next={null} />}
        >
          <ChecklistRow title="Falta la factura" isDone={false}>
            <span className="flex items-start gap-2 text-amber-700">
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              El estimado quedó confirmado pero no se generó la factura. Vuelve atrás y genera el estimado de nuevo.
            </span>
          </ChecklistRow>
        </StepCard>
      );
    }

    return (
      <StepCard
        stepLabel={stepLabel(ShipmentOrderStep.COBRO)}
        title="Cobro"
        footer={
          <StepFooter
            back={backLink}
            hint={hasNoPackages ? NO_PACKAGES_HINT : 'Si cambiaron tarifas, recalcula antes.'}
            next={
              <StepAction
                variant={StepActionVariant.PRIMARY}
                onClick={props.handleConfirmPreBilling}
                disabled={props.isConfirmingPreBilling || hasNoPackages}
              >
                {props.isConfirmingPreBilling ? 'Confirmando…' : 'Confirmar estimado'}
              </StepAction>
            }
          />
        }
      >
        <ChecklistRow
          title="Estimado"
          isDone
          action={
            <>
              {pdfAction}
              <StepAction
                onClick={() => {
                  props.setPreBillingDeliveryMethod(detail.pre_billing_delivery_method ?? activeDeliveryMethods[0]?.code ?? ('' as DeliveryMethod));
                  props.setShowPreBillingModal(true);
                }}
              >
                Recalcular
              </StepAction>
            </>
          }
        >
          <span className="text-lg font-extrabold text-slate-900">{formatCrc(Number(detail.pre_billing_amount ?? 0))}</span>
          {detail.pre_billing_delivery_method && (
            <span className="ml-2">Entrega: {resolveDeliveryMethodLabel(detail.pre_billing_delivery_method, deliveryMethodsData)}</span>
          )}
        </ChecklistRow>
        {notifyRow}
      </StepCard>
    );
  };

  const renderDespacho = () => {
    const paymentRow = (
      <ChecklistRow
        title="Pago"
        isDone={isPaid}
        action={isPaid ? (
          <StepAction onClick={props.handleNotifyPaymentConfirmed} disabled={props.isNotifyingPaymentConfirmed}>
            {detail.billing_payment_notified_at ? 'Reenviar aviso' : 'Avisar pago al cliente'}
          </StepAction>
        ) : (
          <StepAction onClick={() => props.setShowBillingModal(true)}>Registrar pago</StepAction>
        )}
      >
        {isPaid
          ? detail.billing_payment_notified_at
            ? `Pagada · aviso enviado el ${formatBusinessDate(detail.billing_payment_notified_at)}`
            : 'Pagada · falta avisarle al cliente'
          : isPickup ? 'Por cobrar: se cobra al retirar' : PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PENDIENTE_PAGO]}
      </ChecklistRow>
    );

    if (isPickup) {
      return (
        <StepCard
          stepLabel={stepLabel(ShipmentOrderStep.DESPACHO)}
          title="Listo para retiro"
          footer={
            <StepFooter
              hint={hasNoPackages ? NO_PACKAGES_HINT : null}
              next={
                <StepAction variant={StepActionVariant.PRIMARY} onClick={props.handleAdvanceToClosing} disabled={props.isAdvancingToClosing || hasNoPackages}>
                  {props.isAdvancingToClosing ? 'Pasando…' : 'Pasar a cierre'}
                </StepAction>
              }
            />
          }
        >
          {paymentRow}
        </StepCard>
      );
    }

    return (
      <StepCard
        stepLabel={stepLabel(ShipmentOrderStep.DESPACHO)}
        title="Despacho"
        footer={
          <StepFooter
            hint={hasNoPackages ? NO_PACKAGES_HINT : !detail.tracking_code ? 'Carga la guía para pasar al cierre.' : null}
            next={
              <StepAction
                variant={StepActionVariant.PRIMARY}
                onClick={props.handleAdvanceToClosing}
                disabled={props.isAdvancingToClosing || !detail.tracking_code || hasNoPackages}
              >
                {props.isAdvancingToClosing ? 'Pasando…' : 'Pasar a cierre'}
              </StepAction>
            }
          />
        }
      >
        {paymentRow}
        <ChecklistRow
          title="Solicitud al proveedor"
          isDone={!!detail.shipment_requested_at}
          action={
            <StepAction onClick={props.handleOpenShipmentRequestModal} disabled={props.isCopyingRequest}>
              {detail.shipment_requested_at ? 'Copiar de nuevo' : 'Copiar solicitud'}
            </StepAction>
          }
        >
          {detail.shipment_requested_at
            ? `Solicitada el ${formatBusinessDate(detail.shipment_requested_at)}`
            : 'Pendiente'}
        </ChecklistRow>
        <ChecklistRow
          title="Aviso de despacho"
          isDone={!!detail.customer_notified_shipment_at}
          action={
            <StepAction onClick={props.handleNotifyCustomerShipmentRequested} disabled={props.isNotifyingShipmentRequested}>
              {detail.customer_notified_shipment_at ? 'Reenviar' : isPaid ? 'Avisar' : 'Avisar y recordar pago'}
            </StepAction>
          }
        >
          {detail.customer_notified_shipment_at
            ? `Avisado el ${formatBusinessDate(detail.customer_notified_shipment_at)}`
            : 'Pendiente'}
        </ChecklistRow>
        <ChecklistRow
          title="Guía del proveedor"
          isDone={!!detail.tracking_code}
          action={
            <StepAction onClick={props.handleOpenTrackingModal}>
              {detail.tracking_code ? 'Editar' : 'Agregar guía'}
            </StepAction>
          }
        >
          {detail.tracking_code
            ? <span className="font-mono text-slate-700 break-all">{detail.tracking_code}</span>
            : 'Esperando al proveedor'}
        </ChecklistRow>
        {detail.tracking_code && (
          <ChecklistRow
            title="Guía y rastreo al cliente"
            isDone={null}
            action={props.canNotifyDispatch ? (
              <StepAction onClick={props.handleNotifyDispatch} disabled={props.isNotifyingDispatch}>
                Enviar guía
              </StepAction>
            ) : undefined}
          >
            {props.canNotifyDispatch
              ? 'Guía y enlace de rastreo'
              : 'Falta el enlace de rastreo en Ajustes → Métodos de entrega'}
          </ChecklistRow>
        )}
      </StepCard>
    );
  };

  const renderCierre = () => (
    <StepCard
      stepLabel={stepLabel(ShipmentOrderStep.NOTIFICACION)}
      title="Cierre"
      description={isPickup ? 'Finaliza cuando el cliente retire.' : undefined}
      footer={
        <StepFooter
          hint={hasNoPackages ? NO_PACKAGES_HINT : 'La orden queda como entregada.'}
          next={
            <StepAction variant={StepActionVariant.PRIMARY} onClick={props.handleFinalizeOrder} disabled={props.isFinalizing || hasNoPackages}>
              {props.isFinalizing ? 'Finalizando…' : 'Finalizar orden'}
            </StepAction>
          }
        />
      }
    >
      {!isPickup && detail.tracking_code && (
        <ChecklistRow
          title="En camino"
          isDone
          action={props.canNotifyDispatch ? (
            <StepAction variant={StepActionVariant.LINK} onClick={props.handleNotifyDispatch} disabled={props.isNotifyingDispatch}>
              Reenviar la guía
            </StepAction>
          ) : undefined}
        >
          Guía <span className="font-mono text-slate-700 break-all">{detail.tracking_code}</span>
        </ChecklistRow>
      )}
      {!isPickup && (
        <ChecklistRow
          title="Costo real del envío"
          isDone={hasActualFee}
          action={
            <StepAction onClick={props.handleOpenActualFeeModal}>
              {hasActualFee ? 'Editar' : 'Registrar'}
            </StepAction>
          }
        >
          {hasActualFee
            ? `${formatCrc(Number(detail.billing_actual_delivery_fee_crc))} · se cobró ${formatCrc(Number(originalFeeCrc ?? 0))}`
            : 'Opcional: lo que cobró el transportista'}
        </ChecklistRow>
      )}
      {hasChangeDue && (
        <ChecklistRow
          title={`Vuelto de ${formatCrc(changeCrc)}`}
          isDone={!!detail.billing_change_returned}
          action={!detail.billing_change_returned ? (
            <StepAction onClick={props.handleMarkChangeReturned} disabled={props.isMarkingChangeReturned}>
              Marcar como devuelto
            </StepAction>
          ) : undefined}
        >
          {detail.billing_change_returned ? 'Devuelto' : 'Se cobró de más: pendiente de devolver'}
        </ChecklistRow>
      )}
      {hasBilling && !isPaid && (
        <ChecklistRow
          title="Pago"
          isDone={false}
          action={<StepAction onClick={() => props.setShowBillingModal(true)}>Registrar pago</StepAction>}
        >
          {PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PENDIENTE_PAGO]}
        </ChecklistRow>
      )}
    </StepCard>
  );

  const activeStep = {
    [ShipmentOrderStep.CONFIRMACION]: renderConfirmation,
    [ShipmentOrderStep.COBRO]: renderCobro,
    [ShipmentOrderStep.DESPACHO]: renderDespacho,
    [ShipmentOrderStep.NOTIFICACION]: renderCierre,
  }[detail.current_step as Exclude<ShipmentOrderStep, ShipmentOrderStep.FINALIZADA>];

  const canUnassign = detail.status === ConsolidationStatus.ABIERTO && !hasBilling && detail.packages.length > 1;

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatTile label="Peso">{totalWeight}</StatTile>
        <StatTile label="Monto">
          {amountToShow != null && paymentStatus !== ConsolidationPaymentStatus.SIN_ESTIMADO
            ? formatCrc(Number(amountToShow))
            : <span className="text-slate-400">—</span>}
        </StatTile>
        <StatTile label="Pago">
          <Badge tone={PAYMENT_STATUS_TONE[paymentStatus]}>{PAYMENT_STATUS_LABEL[paymentStatus]}</Badge>
        </StatTile>
      </div>

      {!isFinalized && <Stepper currentStep={detail.current_step} />}

      <div className={`grid grid-cols-1 gap-6 items-start ${isFinalized ? '' : 'xl:grid-cols-[minmax(0,1fr)_320px]'}`}>
        <div className="space-y-6 min-w-0">
          {isFinalized ? (
            <>
              <FinalizedSummary
                detail={detail}
                deliveryMethods={deliveryMethodsData}
                isPickup={isPickup}
                onOpenBilling={() => props.setShowBillingModal(true)}
              />
              {props.finalizedContent}
            </>
          ) : activeStep?.()}

          <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 sm:p-6">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-extrabold text-slate-900">Paquetes ({detail.packages.length})</h2>
              {props.canAssignPackages && (
                <StepAction
                  onClick={props.handleOpenAssignModal}
                  disabled={props.isLoadingAvailable}
                  title={detail.current_step === ShipmentOrderStep.COBRO ? 'Se recalculará el estimado' : undefined}
                >
                  <Plus size={14} /> Agregar
                </StepAction>
              )}
            </div>
            {hasBilling && !props.canAssignPackages && (detail.current_step === ShipmentOrderStep.CONFIRMACION || detail.current_step === ShipmentOrderStep.COBRO) && (
              <p className="mb-3 text-sm text-slate-500">La orden ya tiene factura: no se pueden agregar ni quitar paquetes.</p>
            )}
            {detail.packages.length === 0 ? (
              <p className="text-center py-6 text-slate-500 text-sm">Esta orden no tiene paquetes.</p>
            ) : (
              <>
                <PackageTable
                  packages={detail.packages}
                  canUnassign={canUnassign}
                  isUnassigning={props.isUnassigning}
                  onUnassign={props.requestUnassignPackage}
                />
                {detail.status === ConsolidationStatus.ABIERTO && !hasBilling && detail.packages.length === 1 && (
                  <p className="text-xs text-slate-500 mt-3 text-center">
                    Una orden necesita al menos un paquete.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* En la finalizada la ficha ya trae todo el resumen. */}
        {!isFinalized && (
          <aside className="xl:sticky xl:top-24">
            <OrderSummaryCard
              detail={detail}
              deliveryMethods={deliveryMethodsData}
              isPickup={isPickup}
              onOpenBilling={hasBilling && detail.current_step !== ShipmentOrderStep.COBRO ? () => props.setShowBillingModal(true) : undefined}
            />
          </aside>
        )}
      </div>
    </>
  );
};
