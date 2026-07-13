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
  Wallet,
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { useShipmentOrderDetail } from './use-shipment-order-detail';
import {
  ConsolidationStatus,
  ConsolidationPackage,
  DeliveryMethod,
} from '@/types/logistics/logistics.types';

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
    isGeneratingPreBilling,
    handleConfirmPreBilling,
    isConfirmingPreBilling,
    handleDownloadPreBillingPDF,

    handleMarkAsPaid, isMarkingPaid,
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

      {/* PRE-BILLING / BILLING CARD */}
      {!hasBilling && (
        <div>
          {!hasPreBilling ? (
            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between p-5">
              <div>
                <p className="text-xs font-black text-slate-700">Prefactura</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Genera el estimado para enviar al cliente. Esto cierra la orden de envío.
                </p>
              </div>
              <button
                onClick={() => setShowPreBillingModal(true)}
                disabled={detail.packages.length === 0}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-40"
              >
                <FileText size={14} />
                Generar Estimado
              </button>
            </div>
          ) : preBillingConfirmed ? (
            <div className="bg-white rounded-[2rem] border border-emerald-100 shadow-sm flex items-center justify-between p-5">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-800">Prefactura confirmada</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">
                    {formatCRC(detail.pre_billing_amount ?? 0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all"
              >
                <Download size={13} />
                PDF
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-[2rem] border border-amber-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-black text-amber-900">Estimado pendiente de confirmación</p>
                  <p className="text-[10px] text-amber-700 mt-0.5">
                    {detail.pre_billing_delivery_method
                      ? `Entrega: ${DELIVERY_LABELS[detail.pre_billing_delivery_method]}`
                      : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-[10px] hover:bg-amber-50 transition-all"
                  >
                    <Download size={12} />
                    PDF
                  </button>
                  <button
                    onClick={() => setShowPreBillingModal(true)}
                    className="text-[9px] font-black text-amber-700 underline underline-offset-2"
                  >
                    Recalcular
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-2xl font-black text-amber-900">
                  {formatCRC(detail.pre_billing_amount ?? 0)}
                </p>
                <button
                  onClick={handleConfirmPreBilling}
                  disabled={isConfirmingPreBilling}
                  className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-500 transition-all disabled:opacity-40"
                >
                  <CheckCircle size={14} />
                  {isConfirmingPreBilling ? 'Confirmando...' : 'Confirmar y Facturar'}
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
          {!isPaid && (
            <button
              onClick={handleMarkAsPaid}
              disabled={isMarkingPaid}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all disabled:opacity-40"
            >
              <Wallet size={14} />
              {isMarkingPaid ? 'Registrando...' : 'Marcar como pagado'}
            </button>
          )}
        </div>
      )}

      {/* PACKAGES LIST */}
      <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-6">
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-4">
          Paquetes en esta orden de envío
        </p>
        {detail.packages.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">
            Sin paquetes asignados aún.
          </div>
        ) : (
          <PackageTable
            packages={detail.packages}
            canUnassign={detail.status === ConsolidationStatus.ABIERTO && !hasBilling}
            isUnassigning={isUnassigning}
            onUnassign={handleUnassignPackage}
          />
        )}
      </div>

      {/* ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-3">
        {detail.status === ConsolidationStatus.CERRADO && (
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
                    ? (hasPreBilling && !preBillingConfirmed
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
            className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 flex-shrink-0"
          >
            <X size={14} />
          </button>
        )}
      </div>
    ))}
  </div>
);

export default ShipmentOrderDetailContainer;
