import React from 'react';
import {
  CheckCircle,
  AlertCircle,
  Plus,
  MessageCircle,
} from 'lucide-react';
import { ConsolidationStatus, ConsolidationDetail, ShipmentOrderStep, DeliveryMethod, DeliveryMethodEntity } from '@/types/logistics/logistics.types';
import { resolveZone } from '@/shared/constants/costa-rica-locations';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { PackageTable } from './package-table';
import { StepTimeline } from './step-timeline';

// Figurita de pasos del wizard. 4 pasos numerados — la orden nace con
// paquetes asignados, así que "asignar paquetes" no es un paso propio.
// Finalizada (5) no se dibuja en la línea: cuando la orden llega ahí, el
// stepper entero deja de mostrarse y la pantalla vuelve a ser la de siempre.
const STEP_ITEMS: { step: ShipmentOrderStep; label: string }[] = [
  { step: ShipmentOrderStep.CONFIRMACION, label: 'Confirmación' },
  { step: ShipmentOrderStep.COBRO, label: 'Cobro' },
  { step: ShipmentOrderStep.DESPACHO, label: 'Despacho' },
  { step: ShipmentOrderStep.NOTIFICACION, label: 'Notificación' },
];

const formatCRC = (n: number) => `₡${Math.round(n).toLocaleString('es-CR')}`;

export interface WizardStepsSectionProps {
  detail: ConsolidationDetail;
  deliveryMethodsData: DeliveryMethodEntity[] | undefined;
  activeDeliveryMethods: DeliveryMethodEntity[];

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
  handleAdvanceToDispatchClick: () => void;
  // Transición dinámica de status (calcula CERRADO→DESPACHADO o
  // DESPACHADO→ENTREGADO según detail.status en el momento) — la usa el
  // Siguiente del paso 3, que NO debe reutilizar el modal de despacho
  // (setQuickActionTarget('dispatch')) porque ese quedó fijo a la transición
  // del paso 2→3.
  handleAdvanceStatus: () => void;
  // "Atrás" del paso 2 — ejecuta la reapertura directo, sin modal ni el texto
  // "Volver a abrir": vive junto al Siguiente en la card, mismo criterio de
  // "back ≡ reabrir" ya acordado (solo visible si la factura no está pagada;
  // desde el paso 3 no existe, el proveedor ya tiene la solicitud).
  handleGoBackToConfirmation: () => void;
  setShowBillingModal: (v: boolean) => void;

  handleOpenShipmentRequestModal: () => void;
  isCopyingRequest: boolean;
  handleNotifyCustomerShipmentRequested: () => void;
  isNotifyingShipmentRequested: boolean;
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

  canAssignPackages: boolean;
  handleOpenAssignModal: () => void;
  isLoadingAvailable: boolean;
  handleUnassignPackage: (packageUuid: string) => void;
  isUnassigning: boolean;
}

/**
 * Wizard completo: stats row + figurita de pasos + contenido de cada paso +
 * lista de paquetes. Extraído del contenedor principal porque ese archivo
 * (shipment-order-detail.tsx) superaba las ~1900 líneas y cada edición grande
 * corría riesgo de desbalancear el JSX anidado — un componente propio, más
 * chico, es más fácil de verificar de forma aislada.
 *
 * Layout: mobile muestra solo el paso activo (wizard estricto, JS oculta el
 * resto). Desktop/iPad (md+) muestra los 4 pasos en fila horizontal, el activo
 * interactivo y los demás atenuados/bloqueados — pedido explícito del dueño,
 * con scroll horizontal como red de seguridad si no entra en 768px.
 */
export const WizardStepsSection: React.FC<WizardStepsSectionProps> = (props) => {
  const { detail, deliveryMethodsData, activeDeliveryMethods } = props;

  const hasBilling = !!detail.billing_uuid;
  const hasPreBilling = !!detail.pre_billing_uuid;
  const preBillingConfirmed = !!detail.pre_billing_confirmed;
  const isPaid = !!detail.billing_is_paid;
  const amountToShow = detail.billing_total_amount_crc ?? detail.pre_billing_amount;

  const showStepper = detail.current_step !== ShipmentOrderStep.FINALIZADA;
  const isConfirmationStep = detail.current_step === ShipmentOrderStep.CONFIRMACION;
  const isCobroStep = detail.current_step === ShipmentOrderStep.COBRO;
  const isDispatchStep = detail.current_step === ShipmentOrderStep.DESPACHO;
  const isNotificationStep = detail.current_step === ShipmentOrderStep.NOTIFICACION;

  const hasActualFee = detail.billing_actual_delivery_fee_crc != null;
  const originalFeeCrc = detail.billing_original_delivery_fee_crc ?? detail.billing_delivery_fee_crc;
  const changeCrc = hasActualFee && originalFeeCrc != null
    ? Number(originalFeeCrc) - Number(detail.billing_actual_delivery_fee_crc)
    : 0;
  const hasChangeDue = hasActualFee && changeCrc > 0;

  /**
   * Clases de cada tarjeta de paso. flex flex-col + h-full: las 4 cards se
   * estiran a la altura de la más alta (el padre ya es un flex row en
   * desktop) y cada una empuja su timeline con flex-1, dejando el "Siguiente"
   * (el último punto del timeline, marcado isAction) siempre al fondo — para
   * que los 4 botones de avance queden a la misma altura sin importar cuántos
   * puntos tenga cada paso arriba. El activo es interactivo y con transición
   * al entrar; los demás quedan ocultos en mobile (hidden md:block) y, en
   * desktop, atenuados y bloqueados con pointer-events-none — no editables
   * ahí, para eso existe "Volver a abrir".
   */
  const stepCardClass = (isActive: boolean) =>
    // Sin h-full a propósito: en un flex row, items-stretch (default) del
    // padre ya iguala la altura de las 4 cards a la más alta por sí solo.
    // h-full lo contradecía (fuerza 100% de un padre sin altura intrínseca en
    // vez de dejar que stretch la calcule), por eso las cards no quedaban
    // parejas.
    `flex-1 min-w-[280px] md:min-w-[260px] flex flex-col bg-white rounded-[2rem] border shadow-sm p-5 transition-all ${
      isActive
        ? 'border-slate-100 animate-in fade-in slide-in-from-bottom-2 duration-300'
        : 'hidden md:flex border-slate-100 opacity-40 grayscale pointer-events-none select-none'
    }`;

  if (!showStepper) return null;

  return (
    <>
      {/* STATS ROW — arriba del wizard: es lo primero que el operador necesita
          ver al abrir la orden (cuánto pesa, cuánto debe, si ya pagó). */}
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

      {/* STEPPER (círculos de progreso) */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5">
        <div className="flex items-center">
          {STEP_ITEMS.map((item, idx) => {
            const isCompleted = detail.current_step > item.step;
            const isActive = detail.current_step === item.step;
            return (
              <React.Fragment key={item.step}>
                <div className="flex flex-col items-center gap-1.5 flex-shrink-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-black border-2 transition-all ${
                      isCompleted
                        ? 'bg-emerald-500 border-emerald-500 text-white'
                        : isActive
                          ? 'bg-slate-900 border-slate-900 text-white'
                          : 'bg-white border-slate-200 text-slate-300'
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={16} /> : item.step}
                  </div>
                  <span
                    className={`text-[9px] font-black uppercase tracking-widest whitespace-nowrap ${
                      isActive ? 'text-slate-800' : isCompleted ? 'text-emerald-600' : 'text-slate-300'
                    }`}
                  >
                    {item.label}
                  </span>
                </div>
                {idx < STEP_ITEMS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${
                    detail.current_step > item.step ? 'bg-emerald-500' : 'bg-slate-100'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* LOS 4 PASOS — fila horizontal en desktop/iPad (md+), scroll
          horizontal si no entra; en mobile solo se ve el activo (hidden en
          los demás vía stepCardClass). El overflow-x va en un wrapper
          separado del que hace items-stretch: overflow + stretch en el mismo
          nivel flex hacía que la altura no se igualara (el navegador no tenía
          una altura de referencia clara para estirar dentro de un contenedor
          con scroll), por eso las cards no quedaban parejas. */}
      <div className="md:overflow-x-auto md:pb-2">
        <div className="flex flex-col md:flex-row md:items-stretch gap-4">

        {/* PASO 1 — Confirmación: cada botón visible es su propio punto del
            timeline (pedido explícito del dueño), no agrupados bajo un
            título compartido. */}
        <div className={stepCardClass(isConfirmationStep)}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Confirmación</p>
          <StepTimeline
            items={[
              {
                key: 'address-info',
                title: 'Dirección de entrega',
                content: detail.delivery_exact_address ? (
                  <>
                    <p className="text-sm font-bold text-slate-800">{detail.delivery_address_label || 'Dirección'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {detail.delivery_exact_address}, {detail.delivery_district}, {detail.delivery_canton}, {detail.delivery_province}
                      {detail.delivery_canton ? ` · Zona ${resolveZone(detail.delivery_canton)}` : ''}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin dirección asignada</p>
                ),
              },
              {
                key: 'address-action',
                title: detail.delivery_exact_address ? 'Confirmar con el cliente' : 'Pedir dirección',
                content: detail.delivery_exact_address ? (
                  <button
                    onClick={props.handleCopyAddressConfirmation}
                    disabled={props.isCopyingAddressConfirmation}
                    title="Copiar mensaje para que el cliente confirme la dirección"
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all disabled:opacity-40"
                  >
                    Confirmar dirección
                  </button>
                ) : (
                  <button
                    onClick={props.handleCopyAddressRequest}
                    disabled={props.isCopyingAddressRequest}
                    title="Copiar mensaje para pedirle los datos de entrega al cliente"
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all disabled:opacity-40"
                  >
                    Pedir dirección
                  </button>
                ),
              },
              {
                key: 'address-change',
                title: 'Cambiar dirección',
                content: (
                  <button
                    onClick={props.handleOpenAddressModal}
                    disabled={props.isLoadingAddresses}
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40"
                  >
                    Cambiar
                  </button>
                ),
              },
              {
                key: 'method-info',
                title: 'Método de envío',
                content: detail.delivery_method ? (
                  <p className="text-sm font-bold text-slate-800">{resolveDeliveryMethodLabel(detail.delivery_method, deliveryMethodsData)}</p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin elegir — se pedirá al generar el estimado</p>
                ),
              },
              {
                key: 'method-change',
                title: 'Cambiar método',
                content: (
                  <button
                    onClick={props.handleOpenMethodModal}
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all"
                  >
                    Cambiar
                  </button>
                ),
              },
              ...(!hasPreBilling ? [{
                key: 'estimate',
                title: 'Generar estimado',
                isAction: true,
                content: (
                  <>
                    <p className="text-[11px] text-slate-400 mb-2">
                      {props.step1BlockedReason ?? 'Genera el estimado para enviar al cliente.'}
                    </p>
                    <button
                      onClick={props.handleGenerateEstimateClick}
                      disabled={detail.packages.length === 0 || props.isGeneratingPreBilling || !!props.step1BlockedReason}
                      title={props.step1BlockedReason ?? 'Genera el estimado y avanza al paso de cobro'}
                      className="w-full flex items-center justify-center px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all disabled:opacity-40"
                    >
                      {props.isGeneratingPreBilling ? 'Generando...' : 'Siguiente'}
                    </button>
                  </>
                ),
              }] : []),
            ]}
          />
        </div>

        {/* PASO 2 — Cobro: cada botón visible es su propio punto del
            timeline. Orden confirmado por el dueño para la rama con factura:
            PDF, WhatsApp, Ver detalle, Siguiente. */}
        <div className={stepCardClass(isCobroStep)}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Cobro</p>

          {detail.pre_billing_notified_at && !hasBilling && (
            <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 mb-3">
              <MessageCircle size={14} className="text-blue-500 flex-shrink-0" />
              <p className="text-xs font-bold text-blue-700">
                Notificado el {new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })} · esperando pago
              </p>
            </div>
          )}

          {!hasBilling && preBillingConfirmed && (
            <StepTimeline
              items={[
                {
                  key: 'confirmed',
                  title: 'Prefactura confirmada',
                  content: <p className="text-sm font-black text-emerald-800">{formatCRC(detail.pre_billing_amount ?? 0)}</p>,
                },
                {
                  key: 'pdf',
                  title: 'PDF',
                  content: (
                    <button
                      onClick={() => props.handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all"
                    >
                      PDF
                    </button>
                  ),
                },
                {
                  key: 'whatsapp',
                  title: 'WhatsApp',
                  content: (
                    <button
                      onClick={props.handleNotifyPreBilling}
                      disabled={props.isNotifyingPreBilling}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all disabled:opacity-40"
                    >
                      {detail.pre_billing_notified_at ? 'Reenviar' : 'WhatsApp'}
                    </button>
                  ),
                },
                {
                  key: 'inconsistent',
                  title: 'Estado inconsistente',
                  isAction: true,
                  // Este estado (prefactura is_confirmed=true pero sin
                  // factura) no debería ocurrir en el flujo actual:
                  // confirmPreBilling crea la factura y marca
                  // is_confirmed=true en la misma transacción
                  // (logistics.repo.ts). Solo aparece en datos de una orden
                  // anterior a ese cambio o inconsistentes. No se ofrece un
                  // "Siguiente" que reintente confirmar — el backend lo
                  // rechaza explícitamente. Sí se ofrece "Atrás": es la única
                  // salida sana de este estado sin llamar a soporte (borra
                  // el estimado y vuelve al paso 1).
                  content: (
                    <>
                      <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-3 py-2.5 mb-2">
                        <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-amber-700 leading-relaxed">
                          Esta orden quedó confirmada sin factura generada — un estado inconsistente que no debería
                          ocurrir.
                        </p>
                      </div>
                      <button
                        onClick={props.handleGoBackToConfirmation}
                        disabled={props.isUpdating}
                        title="Vuelve al paso de confirmación — el estimado se descarta"
                        className="w-full flex items-center justify-center px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all disabled:opacity-40"
                      >
                        Atrás
                      </button>
                    </>
                  ),
                },
              ]}
            />
          )}

          {!hasBilling && !preBillingConfirmed && (
            <StepTimeline
              items={[
                {
                  key: 'pending',
                  title: 'Estimado pendiente de confirmación',
                  content: (
                    <>
                      {detail.pre_billing_delivery_method && (
                        <p className="text-[10px] text-amber-700 mb-2">
                          Entrega: {resolveDeliveryMethodLabel(detail.pre_billing_delivery_method, deliveryMethodsData)}
                        </p>
                      )}
                      <p className="text-xl font-black text-amber-900">{formatCRC(detail.pre_billing_amount ?? 0)}</p>
                    </>
                  ),
                },
                {
                  key: 'pdf',
                  title: 'PDF',
                  content: (
                    <button
                      onClick={() => props.handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-50 transition-all"
                    >
                      PDF
                    </button>
                  ),
                },
                {
                  key: 'whatsapp',
                  title: 'WhatsApp',
                  content: (
                    <button
                      onClick={props.handleNotifyPreBilling}
                      disabled={props.isNotifyingPreBilling}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-50 transition-all disabled:opacity-40"
                    >
                      {detail.pre_billing_notified_at ? 'Reenviar' : 'WhatsApp'}
                    </button>
                  ),
                },
                {
                  key: 'recalculate',
                  title: 'Recalcular',
                  content: (
                    <button
                      onClick={() => {
                        props.setPreBillingDeliveryMethod(detail.pre_billing_delivery_method ?? activeDeliveryMethods[0]?.code ?? ('' as DeliveryMethod));
                        props.setShowPreBillingModal(true);
                      }}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white border border-amber-200 text-amber-700 rounded-xl font-bold text-xs hover:bg-amber-50 transition-all"
                    >
                      Recalcular
                    </button>
                  ),
                },
                {
                  key: 'confirm',
                  title: 'Confirmar estimado',
                  isAction: true,
                  // Atrás siempre disponible acá: esta rama nunca tiene
                  // factura (!hasBilling), así que no hay pago que proteger —
                  // a diferencia de la rama hasBilling, donde sí se chequea
                  // isPaid.
                  content: (
                    <>
                      <div className="flex flex-col gap-2 mb-2">
                        <button
                          onClick={props.handleGoBackToConfirmation}
                          disabled={props.isUpdating}
                          title="Vuelve al paso de confirmación — el estimado se descarta"
                          className="w-full flex items-center justify-center px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all disabled:opacity-40"
                        >
                          Atrás
                        </button>
                        <button
                          onClick={props.handleConfirmPreBilling}
                          disabled={props.isConfirmingPreBilling}
                          title="Confirma el estimado y genera la factura"
                          className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all disabled:opacity-40"
                        >
                          {props.isConfirmingPreBilling ? 'Confirmando...' : 'Siguiente'}
                        </button>
                      </div>
                      <p className="text-[10px] text-amber-700/80 leading-relaxed">
                        Si las tarifas cambiaron desde que se generó y ya compartiste el monto, usa &quot;Recalcular&quot; antes de confirmar.
                      </p>
                    </>
                  ),
                },
              ]}
            />
          )}

          {hasBilling && (
            <StepTimeline
              items={[
                {
                  key: 'billing',
                  title: 'Factura generada',
                  content: (
                    <>
                      <p className="text-sm font-black text-emerald-800">{isPaid ? 'Pagada' : 'Pendiente de pago'}</p>
                      {!isPaid && (
                        <div className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 mt-2">
                          <AlertCircle size={14} className="text-amber-500 flex-shrink-0" />
                          <p className="text-xs font-bold text-amber-700">Esperando confirmación de pago</p>
                        </div>
                      )}
                    </>
                  ),
                },
                // PDF, WhatsApp, Ver detalle, Siguiente — orden confirmado por
                // el dueño para esta rama (factura ya generada).
                ...(detail.pre_billing_uuid ? [
                  {
                    key: 'pdf',
                    title: 'PDF',
                    content: (
                      <button
                        onClick={() => props.handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                        className="w-full flex items-center justify-center px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all"
                      >
                        PDF
                      </button>
                    ),
                  },
                  {
                    key: 'whatsapp',
                    title: 'WhatsApp',
                    content: (
                      <button
                        onClick={props.handleNotifyPreBilling}
                        disabled={props.isNotifyingPreBilling}
                        className="w-full flex items-center justify-center px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all disabled:opacity-40"
                      >
                        {detail.pre_billing_notified_at ? 'Reenviar' : 'WhatsApp'}
                      </button>
                    ),
                  },
                ] : []),
                {
                  key: 'detail',
                  title: 'Ver detalle',
                  content: (
                    <button
                      onClick={() => props.setShowBillingModal(true)}
                      className="w-full flex items-center justify-center px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all"
                    >
                      Ver detalle
                    </button>
                  ),
                },
                {
                  key: 'advance',
                  title: 'Avanzar a despacho',
                  isAction: true,
                  // Atrás vive junto al Siguiente, en la misma fila — pedido
                  // explícito del dueño. Solo si no está pagada (mismo
                  // criterio que "Volver a abrir" del header): ejecuta la
                  // reapertura directo, sin modal ni el texto "Volver a
                  // abrir".
                  content: (
                    <div className="flex flex-col gap-2">
                      {!isPaid && (
                        <button
                          onClick={props.handleGoBackToConfirmation}
                          disabled={props.isUpdating}
                          title="Vuelve al paso de confirmación — el estimado se descarta"
                          className="w-full flex items-center justify-center px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-xs hover:bg-amber-100 transition-all disabled:opacity-40"
                        >
                          Atrás
                        </button>
                      )}
                      <button
                        onClick={props.handleAdvanceToDispatchClick}
                        disabled={props.isUpdating}
                        title="Avanza al paso de despacho"
                        className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all disabled:opacity-40"
                      >
                        {props.isUpdating ? 'Actualizando...' : 'Siguiente'}
                      </button>
                    </div>
                  ),
                },
              ]}
            />
          )}
        </div>

        {/* PASO 3 — Despacho: orden real del trabajo confirmado por el dueño —
            1) solicitar al proveedor, 2) el proveedor confirma y manda la
            guía, 3) avisar al cliente, 4) recién ahí se puede avanzar. El
            Siguiente queda bloqueado sin guía cargada. */}
        <div className={stepCardClass(isDispatchStep)}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Despacho</p>
          <StepTimeline
            items={[
              {
                key: 'request',
                title: 'Solicitar envío',
                content: (
                  <button
                    onClick={props.handleOpenShipmentRequestModal}
                    disabled={props.isCopyingRequest}
                    title="Preparar solicitud de envío para el proveedor"
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-900 text-white rounded-xl font-bold text-[11px] hover:bg-slate-800 transition-all disabled:opacity-40"
                  >
                    Solicitar envío
                  </button>
                ),
              },
              // Cargar la guía ES la confirmación del proveedor (dato
              // confirmado por el dueño) — este chip de "esperando" solo se
              // muestra mientras se solicitó pero todavía no hay guía. Una
              // vez cargada, el punto de abajo (Guía de rastreo) ya la
              // muestra como confirmada; mostrar los dos a la vez sería
              // redundante.
              ...(detail.shipment_requested_at && !detail.tracking_code ? [{
                key: 'request-status',
                title: 'Envío solicitado',
                content: (
                  <div className="flex items-center gap-2 bg-violet-50 border border-violet-100 rounded-2xl px-4 py-3">
                    <p className="text-xs font-bold text-violet-700">
                      {new Date(detail.shipment_requested_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })} · esperando que el proveedor confirme la guía
                    </p>
                  </div>
                ),
              }] : []),
              {
                key: 'tracking-info',
                title: 'Guía de rastreo',
                content: detail.tracking_code ? (
                  <>
                    <p className="text-sm font-bold text-slate-800 font-mono break-all">{detail.tracking_code}</p>
                    <p className="text-[10px] text-emerald-600 mt-1">Proveedor confirmó el envío ✓</p>
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin guía — el proveedor la confirma después de solicitar el envío</p>
                ),
              },
              {
                key: 'tracking-action',
                title: detail.tracking_code ? 'Editar guía' : 'Agregar guía',
                content: (
                  <button
                    onClick={props.handleOpenTrackingModal}
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all"
                  >
                    {detail.tracking_code ? 'Editar guía' : 'Agregar guía'}
                  </button>
                ),
              },
              {
                key: 'notify-customer',
                title: 'Avisar al cliente',
                content: (
                  <button
                    onClick={props.handleNotifyCustomerShipmentRequested}
                    disabled={props.isNotifyingShipmentRequested}
                    title="Avisar al cliente que su envío fue solicitado"
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40"
                  >
                    {detail.customer_notified_shipment_at ? 'Reenviar aviso al cliente' : 'Avisar al cliente'}
                  </button>
                ),
              },
              {
                key: 'notify-status',
                title: 'Cliente notificado',
                content: (
                  <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 border ${
                    detail.customer_notified_shipment_at ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'
                  }`}>
                    <p className={`text-xs font-bold ${detail.customer_notified_shipment_at ? 'text-blue-700' : 'text-slate-500'}`}>
                      {detail.customer_notified_shipment_at
                        ? new Date(detail.customer_notified_shipment_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })
                        : 'Cliente sin notificar'}
                    </p>
                  </div>
                ),
              },
              {
                key: 'dispatch',
                title: 'Marcar entregado',
                isAction: true,
                // Este botón es el Siguiente del paso 3 (Despacho → paso 4,
                // Notificación): la transición de status es
                // DESPACHADO→ENTREGADO. Usa handleAdvanceStatus (calcula la
                // transición según detail.status en el momento), NO
                // setQuickActionTarget('dispatch') — ese abre el modal de
                // despacho que ya se usó para entrar a ESTE paso (paso
                // 2→3, CERRADO→DESPACHADO) y reintentarlo acá fallaba porque
                // el backend rechaza la transición sobre una orden que ya no
                // está en CERRADO. Era el bug reportado ("no me deja pasar").
                //
                // Bloqueado sin guía: el dueño confirmó que en la práctica no
                // se avanza sin que el proveedor haya mandado el número de
                // guía — a diferencia de la guía del modal de despacho (paso
                // 2→3), que sigue siendo opcional ahí.
                content: (
                  <>
                    {!detail.tracking_code && (
                      <p className="text-[10px] text-slate-400 mb-2">
                        Carga la guía del proveedor antes de continuar.
                      </p>
                    )}
                    <button
                      onClick={props.handleAdvanceStatus}
                      disabled={props.isUpdating || !detail.tracking_code}
                      title={!detail.tracking_code ? 'Carga la guía de rastreo antes de continuar' : 'Marca la orden como entregada y avanza al paso de notificación'}
                      className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all disabled:opacity-40"
                    >
                      {props.isUpdating ? 'Actualizando...' : 'Siguiente'}
                    </button>
                  </>
                ),
              },
            ]}
          />
        </div>

        {/* PASO 4 — Notificación y cierre: cada botón visible es su propio
            punto. */}
        <div className={stepCardClass(isNotificationStep)}>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Notificación</p>
          <StepTimeline
            items={[
              {
                key: 'notify-info',
                title: 'Aviso de despacho',
                content: detail.tracking_code ? (
                  <p className="text-sm text-slate-600">
                    Guía <span className="font-mono font-bold text-slate-800">{detail.tracking_code}</span>
                  </p>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin guía registrada</p>
                ),
              },
              ...(props.canNotifyDispatch ? [{
                key: 'notify-action',
                title: 'Avisar',
                content: (
                  <button
                    onClick={props.handleNotifyDispatch}
                    disabled={props.isNotifyingDispatch}
                    className="w-full flex items-center justify-center px-3 py-2 bg-rose-600 text-white rounded-xl font-bold text-[11px] hover:bg-rose-500 transition-all disabled:opacity-40"
                  >
                    Avisar
                  </button>
                ),
              }] : []),
              {
                key: 'fee-info',
                title: 'Costo real de envío',
                content: hasActualFee ? (
                  <>
                    <p className="text-sm font-bold text-slate-800">{formatCRC(Number(detail.billing_actual_delivery_fee_crc))}</p>
                    {originalFeeCrc != null && (
                      <p className="text-xs text-slate-500 mt-0.5">Cobrado: {formatCRC(Number(originalFeeCrc))}</p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-slate-400 italic">Sin confirmar</p>
                ),
              },
              {
                key: 'fee-action',
                title: hasActualFee ? 'Editar costo real' : 'Agregar costo real',
                content: (
                  <button
                    onClick={props.handleOpenActualFeeModal}
                    className="w-full flex items-center justify-center px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all"
                  >
                    {hasActualFee ? 'Editar costo real' : 'Agregar costo real'}
                  </button>
                ),
              },
              ...(hasChangeDue ? [{
                key: 'change',
                title: `Devolver ${formatCRC(changeCrc)}`,
                content: (
                  <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
                    <p className="text-[11px] text-amber-600 mb-2">
                      {detail.billing_change_returned ? 'Ya marcado como entregado.' : 'Se le cobró de más al cliente.'}
                    </p>
                    {!detail.billing_change_returned && (
                      <button
                        onClick={props.handleMarkChangeReturned}
                        disabled={props.isMarkingChangeReturned}
                        className="w-full flex items-center justify-center px-3 py-2 bg-amber-500 text-white rounded-xl font-bold text-[11px] hover:bg-amber-600 transition-all disabled:opacity-40"
                      >
                        Marcar entregado
                      </button>
                    )}
                  </div>
                ),
              }] : []),
              {
                key: 'finalize',
                title: 'Finalizar',
                isAction: true,
                content: (
                  <>
                    <p className="text-[10px] text-slate-400 mb-2">
                      El costo real de envío es opcional — se puede completar más adelante.
                    </p>
                    <button
                      onClick={props.handleFinalizeOrder}
                      disabled={props.isFinalizing}
                      title="Finaliza la orden de envío"
                      className="w-full flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all disabled:opacity-40"
                    >
                      {props.isFinalizing ? 'Finalizando...' : 'Siguiente'}
                    </button>
                  </>
                ),
              },
            ]}
          />
        </div>
        </div>
      </div>

      {/* PACKAGES LIST — siempre visible, fuera del wizard por paso. */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Paquetes en esta orden de envío
          </p>
          {props.canAssignPackages && (
            <button
              onClick={props.handleOpenAssignModal}
              disabled={props.isLoadingAvailable}
              title={detail.current_step === ShipmentOrderStep.COBRO ? 'Recalculará el estimado ya generado' : undefined}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40"
            >
              <Plus size={12} />
              Agregar paquetes
            </button>
          )}
        </div>
        {detail.packages.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">Sin paquetes asignados aún.</div>
        ) : (
          <>
            <PackageTable
              packages={detail.packages}
              canUnassign={detail.status === ConsolidationStatus.ABIERTO && !hasBilling && detail.packages.length > 1}
              isUnassigning={props.isUnassigning}
              onUnassign={props.handleUnassignPackage}
            />
            {detail.status === ConsolidationStatus.ABIERTO && !hasBilling && detail.packages.length === 1 && (
              <p className="text-[11px] text-slate-400 mt-3 text-center">
                Es el único paquete de la orden — no se puede quitar. Para vaciarla, elimina la orden completa desde el listado.
              </p>
            )}
          </>
        )}
      </div>
    </>
  );
};
