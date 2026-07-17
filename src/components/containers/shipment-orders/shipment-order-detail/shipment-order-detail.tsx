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
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { BillingDetailModal } from '@/components/common/billing-detail-modal/billing-detail-modal';
import { useShipmentOrderDetail } from './use-shipment-order-detail';
import {
  ConsolidationStatus,
  ConsolidationPackage,
  ConsolidationDetail,
  DeliveryMethod,
  AvailablePackage,
} from '@/types/logistics/logistics.types';
import { resolveZone } from '@/shared/constants/costa-rica-locations';

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

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  CORREOS_CR: 'Correos de Costa Rica',
  TRACOPA: 'Tracopa',
  RETIRO: 'Retiro en oficina',
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
  } = useShipmentOrderDetail(resolvedUuid);

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

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex flex-col">
          <button onClick={handleBack} className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest mb-2">
            <ChevronLeft size={14} /> Volver a órdenes de envío
          </button>
          <Typography variant={TypographyVariant.HEADER} className="tracking-tighter">
            {detail.customer_name}
          </Typography>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            {detail.customer_code} · {detail.customer_email}
          </p>
        </div>
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wide border ${STATUS_COLORS[detail.status]}`}>
          {STATUS_LABELS[detail.status]}
        </span>
      </div>

      {/* STATS ROW */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
          <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border inline-block max-w-full truncate ${STATUS_COLORS[detail.status]}`}>
            {STATUS_LABELS[detail.status]}
          </span>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso Total</p>
          <p className="font-black text-slate-800 text-base">
            {Number(detail.total_weight_lb).toFixed(2)} <span className="text-xs text-slate-400">lb</span>
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 text-center">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paquetes</p>
          <p className="font-black text-slate-800 text-base">{detail.packages.length}</p>
        </div>
      </div>

      {/* DIRECCIÓN DE ENTREGA */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4">
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
        {detail.status === ConsolidationStatus.ABIERTO && (
          <button
            onClick={handleOpenAddressModal}
            disabled={isLoadingAddresses}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40 flex-shrink-0"
          >
            <Pencil size={12} />
            Cambiar
          </button>
        )}
      </div>

      {/* MÉTODO DE ENVÍO */}
      <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="p-2 bg-slate-100 rounded-xl flex-shrink-0">
            <SendHorizonal size={16} className="text-slate-600" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Método de envío</p>
            {detail.delivery_method ? (
              <p className="text-sm font-bold text-slate-800">{DELIVERY_LABELS[detail.delivery_method]}</p>
            ) : (
              <p className="text-sm text-slate-400 italic">Sin elegir — se pedirá al generar el estimado</p>
            )}
          </div>
        </div>
        {detail.status === ConsolidationStatus.ABIERTO && (
          <button
            onClick={handleOpenMethodModal}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[11px] hover:bg-slate-100 transition-all disabled:opacity-40 flex-shrink-0"
          >
            <Pencil size={12} />
            Cambiar
          </button>
        )}
      </div>

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
                      <> · Notificado el {new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR')}</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleNotifyPreBilling}
                  disabled={isNotifyingPreBilling}
                  title={detail.pre_billing_notified_at ? `Notificado el ${new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR')}` : 'Enviar aviso de cobro por WhatsApp'}
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
                      ? `Entrega: ${DELIVERY_LABELS[detail.pre_billing_delivery_method]}`
                      : ''}
                    {detail.pre_billing_notified_at && (
                      <>{detail.pre_billing_delivery_method ? ' · ' : ''}Notificado el {new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR')}</>
                    )}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={handleNotifyPreBilling}
                    disabled={isNotifyingPreBilling}
                    title={detail.pre_billing_notified_at ? `Notificado el ${new Date(detail.pre_billing_notified_at).toLocaleDateString('es-CR')}` : 'Enviar aviso de cobro por WhatsApp'}
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
                      setPreBillingDeliveryMethod(detail.pre_billing_delivery_method ?? 'RETIRO');
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

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-3">
        {detail.status === ConsolidationStatus.CERRADO && !isPaid && (
          <button
            onClick={() => setQuickActionTarget('reopen')}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-bold text-sm hover:bg-amber-100 transition-all disabled:opacity-40"
          >
            <RotateCcw size={16} />
            Volver a abrir
          </button>
        )}
        {NEXT_STATUS_LABEL[detail.status] && (
          <button
            onClick={detail.status === ConsolidationStatus.CERRADO ? () => setQuickActionTarget('dispatch') : handleAdvanceStatus}
            disabled={isUpdating}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
          >
            <ArrowRight size={16} />
            {isUpdating ? 'Actualizando...' : NEXT_STATUS_LABEL[detail.status]}
          </button>
        )}
      </div>

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
                {(['CORREOS_CR', 'TRACOPA', 'RETIRO'] as DeliveryMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPreBillingDeliveryMethod(method)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                      preBillingDeliveryMethod === method
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm">{DELIVERY_LABELS[method]}</span>
                    {preBillingDeliveryMethod === method && (
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
              {(['CORREOS_CR', 'TRACOPA', 'RETIRO'] as DeliveryMethod[]).map((method) => (
                <button
                  key={method}
                  onClick={() => setSelectedMethod(method)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                    selectedMethod === method
                      ? 'bg-slate-900 text-white border-slate-900'
                      : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <span className="font-bold text-sm">{DELIVERY_LABELS[method]}</span>
                  {selectedMethod === method && (
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
                        <p className="font-mono text-sm font-bold text-slate-800 truncate">
                          {pkg.tracking_number}{pkg.store_name ? ` — ${pkg.store_name}` : ''}
                        </p>
                        <p className="text-[10px] text-slate-400">
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

const ProfitCard: React.FC<{ detail: ConsolidationDetail }> = ({ detail }) => {
  // Cobro con las tarifas del snapshot de la prefactura; si la orden sigue
  // abierta, con las vigentes de system_settings (el monto puede variar hasta
  // que se genere el estimado).
  const usingSnapshot = detail.pre_billing_rate_usd != null && detail.pre_billing_exchange != null;
  const rateUsd = Number(usingSnapshot ? detail.pre_billing_rate_usd : detail.current_price_per_lb);
  const exchange = Number(usingSnapshot ? detail.pre_billing_exchange : detail.current_exchange_rate);

  const rows = detail.packages.map((pkg) => {
    const weight = Number(pkg.weight_lb);
    const cobro = weight * rateUsd * exchange;
    const hasCost = pkg.courier_cost_usd != null && pkg.tc_banco != null;
    const costo = hasCost ? Number(pkg.courier_cost_usd) * Number(pkg.tc_banco) : null;
    return { pkg, cobro, costo, ganancia: costo != null ? cobro - costo : null };
  });

  const totalWeight = Number(detail.total_weight_lb);
  const chargedWeight = Math.max(totalWeight, Number(detail.current_min_weight));

  // Entrega: cobro del snapshot de la prefactura si existe; si no, la tarifa
  // vigente que matchea método/zona/peso. El costo real siempre es el vigente
  // de delivery_rates (no se snapshotea).
  const deliveryMethod = detail.pre_billing_delivery_method ?? detail.delivery_method;
  const hasDelivery = deliveryMethod != null && deliveryMethod !== 'RETIRO';
  const deliveryFee = hasDelivery
    ? Number(detail.pre_billing_fee_crc ?? detail.delivery_fee_estimate_crc ?? 0)
    : 0;
  const deliveryCost = hasDelivery ? detail.delivery_cost_crc : 0;
  const missingDeliveryCost = hasDelivery && deliveryCost == null;

  const cobroTotal = chargedWeight * rateUsd * exchange + deliveryFee;
  const costoTotal = rows.reduce((acc, r) => acc + (r.costo ?? 0), 0) + (deliveryCost ?? 0);
  const missingCost = rows.some((r) => r.costo == null);
  const gananciaTotal = cobroTotal - costoTotal;
  const margen = cobroTotal > 0 ? (gananciaTotal / cobroTotal) * 100 : 0;
  const minApplied = chargedWeight > totalWeight;

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-slate-400" />
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
            Rentabilidad · Solo interno
          </p>
        </div>
        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
          {usingSnapshot ? 'Tarifas del estimado' : 'Tarifas vigentes (sin estimado aún)'}
        </span>
      </div>

      <div className="space-y-2">
        {rows.map(({ pkg, cobro, costo, ganancia }) => (
          <div key={pkg.uuid} className="px-4 py-3 bg-slate-50 rounded-2xl">
            <p className="font-mono text-sm font-bold text-slate-800 truncate">{pkg.tracking_number}</p>
            <p className="text-[10px] text-slate-400 mb-2">
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
            <p className="text-sm font-bold text-slate-800">Entrega · {DELIVERY_LABELS[deliveryMethod]}</p>
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

      <div className="mt-3 space-y-0.5">
        {missingCost && (
          <p className="text-[10px] text-amber-600">
            * Ganancia parcial: hay paquetes registrados sin costo de courier o sin tipo de cambio del banco.
          </p>
        )}
        {missingDeliveryCost && (
          <p className="text-[10px] text-amber-600">
            * El costo real de la entrega está por confirmar en la tarifa de {DELIVERY_LABELS[deliveryMethod!]} — no se incluye en el costo total.
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
          <p className="font-mono text-sm font-bold text-slate-800 truncate">{pkg.tracking_number}</p>
          <p className="text-[10px] text-slate-400">
            {Number(pkg.weight_lb).toFixed(2)} lb · {pkg.package_type}{pkg.store_name ? ` · ${pkg.store_name}` : ''}
          </p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
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
