import React from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, History, MapPin, Edit3, Save, DollarSign, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { usePackageDetailContainer } from './use-logistics-detail';
import { PackageStatus } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';

const STATUS_LABELS: Record<PackageStatus, string> = {
    [PackageStatus.PANAMA]:     'En Bodega Panamá',
    [PackageStatus.EN_TRAMITE]: 'En Trámite de Envío',
    [PackageStatus.ENTREGADO]:  'Entregado',
};

export const PackageDetailContainer: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;
    const uuid = router.isReady ? (id as string) : undefined;
    const {
        data, bitacora, calculos, tieneFactura, isLoading, isError, error, refetch,
        isEditingFinancial, isSavingWeight, setIsEditingFinancial, handleSaveFinancial, updateField,
        statusPanel, setStatusPanel, isSavingStatus, handleToggleStatusPanel, handleUpdateStatus,
    } = usePackageDetailContainer(uuid as string);
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();

    // Desglose de la factura con la regla de cobro del cliente. Sin paquetes:
    // esta vista muestra totales, no el detalle línea por línea.
    const facturaBreakdown = tieneFactura && data.totalFacturado != null
        ? buildBillingBreakdown({
            packages: [],
            amountCrc: data.totalFacturado,
            deliveryFeeCrc: data.deliveryFeeCrc ?? 0,
            totalWeightCharged: data.totalWeightCharged ?? data.peso,
            appliedRateUsd: data.appliedRateUsd ?? 0,
            appliedExchange: data.appliedExchange ?? 0,
            billingMode: data.appliedBillingMode,
            discountPercent: data.appliedDiscountPercent,
        })
        : null;

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Typography variant={TypographyVariant.BODY_BOLD} className="animate-pulse text-slate-400 uppercase tracking-widest">
                Obteniendo Información...
            </Typography>
        </div>
    );

    // El mensaje anterior culpaba siempre al UUID, incluso ante un 401 o un
    // fallo del servidor, lo que hacía imposible distinguir la causa real.
    if (isError) {
        const status = (error as { status?: number } | null)?.status;
        const detalle = status === 401
            ? 'Tu sesión expiró. Inicia sesión de nuevo.'
            : status === 404
                ? 'Este paquete no existe o fue eliminado.'
                : 'No se pudo cargar el paquete. Intenta de nuevo.';

        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] px-6 text-center gap-4">
                <AlertCircle className="text-red-500" size={32} />
                <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-700">
                    {detalle}
                </Typography>
                <div className="flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={() => router.back()}
                        className="px-6 py-3 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest hover:border-slate-300 transition-all"
                    >
                        Volver
                    </button>
                    {status !== 401 && (
                        <button
                            onClick={() => refetch()}
                            className="px-6 py-3 rounded-2xl bg-slate-900 text-white font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all"
                        >
                            Reintentar
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 md:space-y-8 pb-20">
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div className="flex flex-col min-w-0 w-full lg:w-auto">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest mb-2">
                        <ChevronLeft size={14} /> Volver a logística
                    </button>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-1">
                        Tracking Number Oficial
                    </label>
                    <span className="font-mono font-black text-primary text-lg sm:text-2xl md:text-3xl tracking-tight break-all leading-tight">
                        {data.tracking}
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row w-full lg:w-auto items-stretch sm:items-center gap-3 shrink-0">
                    <button
                        onClick={handleToggleStatusPanel}
                        disabled={isSavingStatus}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${statusPanel.isOpen
                            ? 'bg-slate-500 text-white hover:bg-slate-600'
                            : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                            }`}
                    >
                        {statusPanel.isOpen ? <><X size={16} /> Cancelar</> : <><RefreshCw size={16} /> Cambiar Estado</>}
                    </button>
                    <button
                        onClick={isEditingFinancial ? handleSaveFinancial : () => setIsEditingFinancial(true)}
                        disabled={isSavingWeight}
                        className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 lg:px-8 py-3 lg:py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isEditingFinancial
                            ? 'bg-slate-900 text-white shadow-lg scale-105'
                            : 'bg-slate-900 text-white hover:bg-slate-800'
                            }`}
                    >
                        {isSavingWeight
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                            : isEditingFinancial
                                ? <><Save size={16} /> Confirmar Cambios</>
                                : <><Edit3 size={16} /> Editar Peso</>
                        }
                    </button>
                </div>
            </div>

            {/* PANEL DE CAMBIO DE ESTADO */}
            {statusPanel.isOpen && (
                <div className="bg-white border border-amber-100 rounded-[2rem] p-4 md:p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-xs uppercase tracking-widest mb-6 flex items-center gap-2">
                        <RefreshCw size={16} className="text-amber-600" /> Registrar cambio de estado
                    </Typography>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] block">Nuevo Estado</label>
                            <select
                                value={statusPanel.nuevoEstado}
                                onChange={(e) => setStatusPanel((p) => ({ ...p, nuevoEstado: e.target.value as PackageStatus }))}
                                className="w-full p-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl font-black text-xs text-amber-700 uppercase tracking-widest transition-all outline-none"
                            >
                                <option value="">— Seleccionar —</option>
                                {Object.values(PackageStatus).map((s) => (
                                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] block">Ubicación (Opcional)</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Ej: Bodega Central, San José"
                                    value={statusPanel.ubicacion}
                                    onChange={(e) => setStatusPanel((p) => ({ ...p, ubicacion: e.target.value }))}
                                    className="w-full pl-11 pr-4 py-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl font-medium text-sm transition-all outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] block flex justify-between">
                                <span>Comentario <span className="text-amber-500 normal-case tracking-normal ml-1">Obligatorio</span></span>
                            </label>
                            <input
                                type="text"
                                placeholder="Motivo del cambio..."
                                value={statusPanel.nota}
                                onChange={(e) => setStatusPanel((p) => ({ ...p, nota: e.target.value }))}
                                className="w-full px-4 py-4 bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl font-medium text-sm transition-all outline-none"
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <button
                            onClick={handleUpdateStatus}
                            disabled={isSavingStatus || !statusPanel.nuevoEstado || !statusPanel.nota.trim()}
                            className="w-full sm:w-auto flex items-center justify-center gap-2 px-10 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSavingStatus
                                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                                : <><Check size={16} /> Confirmar Cambio</>
                            }
                        </button>
                    </div>
                </div>
            )}

            {/* Apilado hasta lg: en iPad vertical (768px) dos columnas dejaban la
                bitácora y la card de logística aplastadas a media pantalla. */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
                {/* COLUMNA IZQUIERDA: Info y Bitácora */}
                <div className="lg:col-span-2 space-y-6 md:space-y-8 order-last lg:order-none min-w-0">

                    {/* CARD PRINCIPAL LOGÍSTICA */}
                    <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                        {/* Peso, estado y notas comparten un solo grid: al subir el
                            tracking al header la columna izquierda quedó con una
                            sola tarjeta y se veía desbalanceada. */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                            <div className="p-4 rounded-2xl border border-slate-100 bg-white">
                                <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Peso Registrado</label>
                                {isEditingFinancial ? (
                                    <div className="flex items-center gap-1 border-b-2 border-primary">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={data.peso}
                                            onKeyDown={(e) => ['.', ',', 'e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                            onPaste={(e) => {
                                                const pasted = e.clipboardData.getData('text');
                                                if (!/^\d+$/.test(pasted.trim())) e.preventDefault();
                                            }}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onChange={(e) => updateField('peso', e.target.value === '' ? '' : Math.floor(Number(e.target.value)))}
                                            className="w-full font-black text-xl text-primary bg-transparent outline-none"
                                        />
                                        <span className="text-xs font-bold text-primary">LB</span>
                                    </div>
                                ) : (
                                    <span className="text-2xl font-black text-slate-800">{data.peso} <small className="text-xs text-slate-400 uppercase">Lbs</small></span>
                                )}
                            </div>

                            <div className="p-4 rounded-2xl bg-slate-900 flex flex-col justify-center">
                                <label className="text-[9px] font-black text-slate-500 uppercase block mb-1">Estado Actual</label>
                                <span className="text-white font-black text-sm tracking-tighter uppercase flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                    {data.estadoPaquete}
                                </span>
                            </div>

                            <div className="sm:col-span-2 lg:col-span-1 bg-amber-50/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-amber-100/50 flex flex-col">
                                <label className="text-[10px] font-black text-amber-600 uppercase tracking-widest block mb-3">Notas del Almacén</label>
                                <p className="text-sm font-medium text-amber-900 italic leading-relaxed flex-grow">
                                    &quot;{data.observaciones}&quot;
                                </p>
                                <div className="mt-4 pt-4 border-t border-amber-200/30 flex items-center gap-2 text-[10px] font-bold text-amber-700/50">
                                    <AlertCircle size={14} /> Solo visible para personal autorizado
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* LÍNEA DE TIEMPO */}
                    <div className="bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <Typography variant={TypographyVariant.BODY_BOLD} className="mb-6 md:mb-10 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <History size={18} className="text-primary" /> Historial de Movimientos
                        </Typography>

                        <div className="space-y-8 md:space-y-10 ml-1 md:ml-4 border-l-2 border-slate-100 pl-5 md:pl-8">
                            {bitacora.length > 0 ? bitacora.map((event) => (
                                <div key={event.id} className="relative">
                                    {/* Centrado sobre la línea: el offset sigue al padding del riel. */}
                                    <div className="absolute -left-[26px] md:-left-[41px] top-0 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm" />
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                        <span className="px-3 py-1 rounded-full bg-slate-100 text-[10px] font-black text-slate-600 uppercase tracking-tighter w-fit">
                                            {event.estado}
                                        </span>
                                        <span className="text-[10px] font-bold text-slate-400">{event.fecha}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-semibold mb-2">{event.nota}</p>
                                    <div className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase">
                                        <MapPin size={12} /> {event.location}
                                    </div>
                                </div>
                            )) : (
                                <p className="text-slate-400 italic text-sm">No hay eventos registrados para este paquete.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: Resumen Financiero */}
                <div className="space-y-6 order-first lg:order-none min-w-0">
                    <div className="bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 text-white shadow-2xl relative overflow-hidden">
                        {/* Decoración de fondo */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between gap-2 mb-6 md:mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                        <DollarSign size={20} />
                                    </div>
                                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-white uppercase text-[10px] tracking-widest">
                                        Detalle de Cobro
                                    </Typography>
                                </div>
                                <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-full ${tieneFactura ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
                                    {tieneFactura ? 'Facturado' : 'Estimado'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {tieneFactura ? (
                                    <>
                                        {data.courierRateName && (
                                            <FinanceRow label="Courier" value={data.courierRateName} />
                                        )}
                                        <FinanceRow label="Peso Cobrado" value={`${data.totalWeightCharged ?? data.peso} Lbs`} />
                                        <FinanceRow
                                            label={facturaBreakdown && !facturaBreakdown.isNormal ? 'Tarifa de Lista' : 'Tarifa Aplicada'}
                                            value={`$${Number(data.appliedRateUsd ?? 0).toFixed(2)}/lb`}
                                        />
                                        {/* El flete sale del monto facturado (ya con la regla de cobro),
                                            no de peso × tarifa: para un cliente al costo o con descuento
                                            ese producto no es lo que se cobró. */}
                                        {facturaBreakdown && !facturaBreakdown.isNormal && (
                                            <FinanceRow label={facturaBreakdown.ruleLabel ?? 'Ajuste'} value={`- ₡${Math.round(facturaBreakdown.descuento).toLocaleString()}`} />
                                        )}
                                        <FinanceRow
                                            label="Flete Internacional"
                                            value={facturaBreakdown ? `₡${Math.round(facturaBreakdown.flete).toLocaleString()}` : '—'}
                                            isHighlight
                                        />

                                        <div className="h-px bg-white/5" />

                                        <FinanceRow label="Tipo de Cambio" value={`₡${Number(data.appliedExchange ?? 0).toLocaleString()}`} />
                                        {data.deliveryMethod && (
                                            <FinanceRow label="Método de Entrega" value={resolveDeliveryMethodLabel(data.deliveryMethod, deliveryMethodsData?.data)} />
                                        )}
                                        {data.deliveryFeeCrc !== null && data.deliveryFeeCrc > 0 && (
                                            <FinanceRow label="Costo de Entrega" value={`₡${Number(data.deliveryFeeCrc).toLocaleString()}`} />
                                        )}

                                        <div className="pt-6 border-t border-white/10">
                                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Total Facturado</label>
                                            <span className="text-2xl md:text-4xl font-black italic tracking-tighter text-emerald-400">
                                                ₡{Number(data.totalFacturado).toLocaleString()}
                                            </span>
                                            <div className="mt-3 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
                                                <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{data.estadoPago}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {data.courierRateName && (
                                            <FinanceRow label="Courier" value={data.courierRateName} />
                                        )}
                                        <FinanceRow label="Peso Registrado" value={`${data.peso} Lbs`} />
                                        <FinanceRow label="Tarifa por Libra" value={`$${calculos.tarifa.toFixed(2)}/lb`} />
                                        {calculos.seguro > 0 && (
                                            <FinanceRow label="Seguro" value={`$${calculos.seguro.toFixed(2)}`} />
                                        )}
                                        <FinanceRow label="Flete Internacional" value={`$${calculos.fleteUSD.toFixed(2)}`} isHighlight />

                                        <div className="h-px bg-white/5" />

                                        <FinanceRow label="Tipo de Cambio" value={`₡${calculos.tc.toLocaleString()}`} />

                                        <div className="pt-6 border-t border-white/10">
                                            <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Estimado a Pagar</label>
                                            <span className="text-2xl md:text-4xl font-black italic tracking-tighter text-slate-300">
                                                ₡{calculos.totalPagar.toLocaleString()}
                                            </span>
                                            <div className="mt-3 px-3 py-1 bg-slate-700/50 border border-slate-600/30 rounded-lg w-fit">
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Sin Factura</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Datos del Cliente (Mocks) */}
                    <div className="bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm">
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-xs uppercase tracking-widest mb-6">Información del Cliente</Typography>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase block">Nombre</label>
                                <span className="text-sm font-bold text-slate-700 break-words">{data.cliente}</span>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase block">Casillero</label>
                                <span className="text-sm font-mono font-bold text-primary break-all">{data.casillero}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Componente Interno para filas
const FinanceRow = ({ label, value, isHighlight }: { label: string, value: string, isHighlight?: boolean }) => (
    <div className="flex justify-between items-center gap-3">
        <span className={`text-xs shrink-0 ${isHighlight ? 'text-slate-300 font-bold' : 'text-slate-500 font-medium'} italic`}>{label}</span>
        <span className={`text-sm font-bold text-right break-words min-w-0 ${isHighlight ? 'text-primary' : 'text-slate-200'}`}>{value}</span>
    </div>
);