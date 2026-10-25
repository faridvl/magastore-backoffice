import React from 'react';
import { useRouter } from 'next/router';
import { ChevronLeft, History, MapPin, Edit3, Save, DollarSign, AlertCircle, RefreshCw, X, Check } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Badge } from '@/components/common/badge/badge';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { usePackageDetailContainer } from './use-logistics-detail';
import { PackageStatus } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { buildBillingBreakdown } from '@/shared/utils/billing-breakdown';
import { formatCrc } from '@/shared/utils/format-crc';
import { formatWeight, formatUsd } from '@/shared/utils/format';
import { describeOrder, describePackageStatus } from '../logistics-labels';

const FIELD_LABEL = 'text-xs font-semibold text-slate-500 block mb-1';
const FIELD_INPUT = 'w-full min-h-[44px] bg-slate-50 border-2 border-transparent focus:border-amber-500 focus:bg-white rounded-2xl font-medium text-base transition-all outline-none';

const PackageStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const { label, tone } = describePackageStatus(status);
    return <Badge tone={tone}>{label}</Badge>;
};

export const PackageDetailContainer: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;
    const uuid = router.isReady ? (id as string) : undefined;
    const {
        data, orderStep, bitacora, calculos, tieneFactura, statusOptions, isLoading, isError, error, refetch,
        isEditingFinancial, isSavingWeight, setIsEditingFinancial, handleSaveFinancial, updateField,
        statusPanel, setStatusPanel, isSavingStatus, handleToggleStatusPanel, handleUpdateStatus,
    } = usePackageDetailContainer(uuid as string);
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
    const orderInfo = describeOrder(orderStep, null);

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
            <Typography variant={TypographyVariant.BODY_BOLD} className="animate-pulse text-slate-400">
                Cargando paquete...
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
                    <Button variant={ButtonVariant.GHOST} onClick={() => router.back()}>
                        Volver
                    </Button>
                    {status !== 401 && (
                        <Button variant={ButtonVariant.PRIMARY} onClick={() => refetch()}>
                            Reintentar
                        </Button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6 md:space-y-8 pb-20">
            {/* HEADER */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex flex-col min-w-0 w-full xl:w-auto">
                    <button onClick={() => router.back()} className="flex items-center gap-2 min-h-[44px] self-start text-slate-500 hover:text-primary transition-colors text-sm font-semibold">
                        <ChevronLeft size={16} /> Volver a paquetes
                    </button>
                    <span className="text-xs font-semibold text-slate-500 block mb-1">
                        Número de rastreo
                    </span>
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="font-mono font-black text-primary text-lg sm:text-2xl md:text-3xl tracking-tight break-all leading-tight">
                            {data.tracking}
                        </span>
                        <PackageStatusBadge status={data.estadoPaquete} />
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full xl:w-auto items-stretch sm:items-center gap-3 shrink-0">
                    <Button
                        variant={ButtonVariant.GHOST}
                        onClick={handleToggleStatusPanel}
                        disabled={isSavingStatus}
                        className="w-full sm:w-auto whitespace-nowrap"
                    >
                        {statusPanel.isOpen ? <><X size={16} /> Cancelar</> : <><RefreshCw size={16} /> Cambiar estado</>}
                    </Button>
                    <Button
                        variant={ButtonVariant.PRIMARY}
                        onClick={isEditingFinancial ? handleSaveFinancial : () => setIsEditingFinancial(true)}
                        disabled={isSavingWeight}
                        className="w-full sm:w-auto whitespace-nowrap"
                    >
                        {isSavingWeight
                            ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                            : isEditingFinancial
                                ? <><Save size={16} /> Guardar peso</>
                                : <><Edit3 size={16} /> Editar peso</>
                        }
                    </Button>
                </div>
            </div>

            {/* PANEL DE CAMBIO DE ESTADO */}
            {statusPanel.isOpen && (
                <div className="bg-white border border-amber-100 rounded-[2rem] p-4 md:p-8 shadow-sm animate-in fade-in slide-in-from-top-2 duration-300">
                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-sm mb-6 flex items-center gap-2">
                        <RefreshCw size={16} className="text-amber-600" /> Registrar cambio de estado
                    </Typography>
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
                        <div className="space-y-2">
                            <label htmlFor="package-new-status" className={FIELD_LABEL}>Nuevo estado</label>
                            <select
                                id="package-new-status"
                                value={statusPanel.nuevoEstado}
                                onChange={(e) => setStatusPanel((p) => ({ ...p, nuevoEstado: e.target.value as PackageStatus }))}
                                className={`${FIELD_INPUT} p-3 font-semibold text-amber-700`}
                            >
                                <option value="">— Seleccionar —</option>
                                {statusOptions.map((s) => (
                                    <option key={s} value={s}>{describePackageStatus(s).label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="package-status-location" className={FIELD_LABEL}>Ubicación (opcional)</label>
                            <div className="relative">
                                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    id="package-status-location"
                                    type="text"
                                    placeholder="Ej: Bodega Central, San José"
                                    value={statusPanel.ubicacion}
                                    onChange={(e) => setStatusPanel((p) => ({ ...p, ubicacion: e.target.value }))}
                                    className={`${FIELD_INPUT} pl-11 pr-4 py-3`}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label htmlFor="package-status-note" className={FIELD_LABEL}>
                                Comentario <span className="text-amber-600 ml-1">Obligatorio</span>
                            </label>
                            <input
                                id="package-status-note"
                                type="text"
                                placeholder="Motivo del cambio..."
                                value={statusPanel.nota}
                                onChange={(e) => setStatusPanel((p) => ({ ...p, nota: e.target.value }))}
                                className={`${FIELD_INPUT} px-4 py-3`}
                            />
                        </div>
                    </div>
                    <div className="mt-6 flex justify-end">
                        <Button
                            variant={ButtonVariant.PRIMARY}
                            onClick={handleUpdateStatus}
                            disabled={isSavingStatus || !statusPanel.nuevoEstado || !statusPanel.nota.trim()}
                            className="w-full sm:w-auto px-10"
                        >
                            {isSavingStatus
                                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Guardando...</>
                                : <><Check size={16} /> Confirmar cambio</>
                            }
                        </Button>
                    </div>
                </div>
            )}

            {/* Apilado hasta xl: en iPad vertical (768px) dos columnas dejaban la
                bitácora y la card de logística aplastadas a media pantalla. */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 md:gap-8">
                {/* COLUMNA IZQUIERDA: Info y Bitácora */}
                {/* `contents` bajo xl: las tarjetas pasan a ser hijas directas de la grilla y se ordenan
                    Peso/Estado/Notas, Cobro, Cliente, Historial; desde xl vuelven a dos columnas. */}
                <div className="contents xl:block xl:col-span-2 xl:space-y-8">

                    {/* CARD PRINCIPAL LOGÍSTICA */}
                    <div className="order-1 min-w-0 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                        {/* Peso, estado y notas comparten un solo grid: al subir el
                            tracking al header la columna izquierda quedó con una
                            sola tarjeta y se veía desbalanceada. */}
                        <div className="grid grid-cols-1 gap-4 md:gap-6">
                            <div className="p-4 rounded-2xl border border-slate-100 bg-white">
                                <span className={FIELD_LABEL}>Peso registrado</span>
                                {isEditingFinancial ? (
                                    <div className="flex items-center gap-1 border-b-2 border-primary">
                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            aria-label="Peso en libras"
                                            value={data.peso}
                                            onKeyDown={(e) => ['.', ',', 'e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                            onPaste={(e) => {
                                                const pasted = e.clipboardData.getData('text');
                                                if (!/^\d+$/.test(pasted.trim())) e.preventDefault();
                                            }}
                                            onWheel={(e) => e.currentTarget.blur()}
                                            onChange={(e) => updateField('peso', e.target.value === '' ? '' : Math.floor(Number(e.target.value)))}
                                            className="w-full min-h-[44px] font-black text-xl text-primary bg-transparent outline-none"
                                        />
                                        <span className="text-sm font-bold text-primary">lb</span>
                                    </div>
                                ) : (
                                    <span className="text-2xl font-black text-slate-800 whitespace-nowrap">{formatWeight(data.peso)}</span>
                                )}
                            </div>

                            <div className="bg-amber-50/50 p-5 md:p-6 rounded-[1.5rem] md:rounded-[2rem] border border-amber-100/50 flex flex-col">
                                <span className="text-sm font-semibold text-amber-700 block mb-3">Notas internas</span>
                                <p className={`text-sm font-medium leading-relaxed flex-grow ${data.observaciones ? 'text-amber-900' : 'text-slate-500'}`}>
                                    {data.observaciones || 'Sin notas internas.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* LÍNEA DE TIEMPO */}
                    <div className="order-4 min-w-0 bg-white p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <Typography variant={TypographyVariant.BODY_BOLD} className="mb-6 md:mb-10 flex items-center gap-2 text-sm">
                            <History size={18} className="text-primary" /> Historial de movimientos
                        </Typography>

                        <div className="space-y-8 md:space-y-10 ml-1 md:ml-4 border-l-2 border-slate-100 pl-5 md:pl-8">
                            {bitacora.length > 0 ? bitacora.map((event) => (
                                <div key={event.id} className="relative">
                                    {/* Centrado sobre la línea: el offset sigue al padding del riel. */}
                                    <div className="absolute -left-[26px] md:-left-[41px] top-0 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm" />
                                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-2">
                                        <span className="w-fit">
                                            <PackageStatusBadge status={event.estado} />
                                        </span>
                                        <span className="text-xs font-semibold text-slate-500">{event.fecha}</span>
                                    </div>
                                    <p className="text-sm text-slate-700 font-semibold mb-2">{event.nota}</p>
                                    {event.location && (
                                        <div className="flex items-center gap-1 text-xs font-semibold text-primary">
                                            <MapPin size={12} /> {event.location}
                                        </div>
                                    )}
                                </div>
                            )) : (
                                <p className="text-slate-500 text-sm">No hay movimientos registrados para este paquete.</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA: Resumen Financiero */}
                <div className="contents xl:block xl:space-y-6">
                    <div className="order-2 min-w-0 bg-slate-900 rounded-[2rem] md:rounded-[3rem] p-5 md:p-8 text-white shadow-2xl relative overflow-hidden">
                        {/* Decoración de fondo */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between gap-2 mb-6 md:mb-8">
                                <div className="flex items-center gap-2">
                                    <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                        <DollarSign size={20} />
                                    </div>
                                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-white text-sm whitespace-nowrap">
                                        Detalle de cobro
                                    </Typography>
                                </div>
                                <span className={`whitespace-nowrap text-xs font-semibold px-2.5 py-1 rounded-full ${tieneFactura ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-300'}`}>
                                    {tieneFactura ? 'Facturado' : 'Estimado'}
                                </span>
                            </div>

                            <div className="space-y-4">
                                {tieneFactura ? (
                                    <>
                                        {data.courierRateName && (
                                            <FinanceRow label="Courier" value={data.courierRateName} />
                                        )}
                                        <FinanceRow label="Peso cobrado" value={formatWeight(data.totalWeightCharged ?? data.peso)} />
                                        <FinanceRow
                                            label={facturaBreakdown && !facturaBreakdown.isNormal ? 'Tarifa de lista' : 'Tarifa aplicada'}
                                            value={`${formatUsd(Number(data.appliedRateUsd ?? 0))}/lb`}
                                        />
                                        {/* El flete sale del monto facturado (ya con la regla de cobro),
                                            no de peso × tarifa: para un cliente al costo o con descuento
                                            ese producto no es lo que se cobró. */}
                                        {facturaBreakdown && !facturaBreakdown.isNormal && (
                                            <FinanceRow label={facturaBreakdown.ruleLabel ?? 'Ajuste'} value={`- ${formatCrc(facturaBreakdown.descuento)}`} />
                                        )}
                                        <FinanceRow
                                            label="Flete internacional"
                                            value={facturaBreakdown ? formatCrc(facturaBreakdown.flete) : '—'}
                                            isHighlight
                                        />

                                        <div className="h-px bg-white/5" />

                                        <FinanceRow label="Tipo de cambio" value={formatCrc(Number(data.appliedExchange ?? 0))} />
                                        {data.deliveryMethod && (
                                            <FinanceRow label="Método de entrega" value={resolveDeliveryMethodLabel(data.deliveryMethod, deliveryMethodsData?.data)} />
                                        )}
                                        {data.deliveryFeeCrc !== null && data.deliveryFeeCrc > 0 && (
                                            <FinanceRow label="Costo de entrega" value={formatCrc(Number(data.deliveryFeeCrc))} />
                                        )}

                                        <div className="pt-6 border-t border-white/10">
                                            <span className="text-xs font-semibold text-slate-400 block mb-2">Total facturado</span>
                                            <span className="block whitespace-nowrap text-2xl md:text-3xl font-black tracking-tight text-emerald-400">
                                                {formatCrc(Number(data.totalFacturado))}
                                            </span>
                                            <div className="mt-3 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
                                                <span className="whitespace-nowrap text-xs font-semibold text-emerald-400">{data.estadoPago}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        {data.courierRateName && (
                                            <FinanceRow label="Courier" value={data.courierRateName} />
                                        )}
                                        <FinanceRow label="Peso registrado" value={formatWeight(data.peso)} />
                                        <FinanceRow label="Tarifa por libra" value={`${formatUsd(calculos.tarifa)}/lb`} />
                                        {calculos.seguro > 0 && (
                                            <FinanceRow label="Seguro" value={formatUsd(calculos.seguro)} />
                                        )}
                                        <FinanceRow label="Flete internacional" value={formatUsd(calculos.fleteUSD)} isHighlight />

                                        <div className="h-px bg-white/5" />

                                        <FinanceRow label="Tipo de cambio" value={formatCrc(calculos.tc)} />

                                        <div className="pt-6 border-t border-white/10">
                                            <span className="text-xs font-semibold text-slate-400 block mb-2">Estimado a cobrar</span>
                                            <span className="block whitespace-nowrap text-2xl md:text-3xl font-black tracking-tight text-slate-300">
                                                {formatCrc(calculos.totalPagar)}
                                            </span>
                                            <div className="mt-3 px-3 py-1 bg-slate-700/50 border border-slate-600/30 rounded-lg w-fit">
                                                <span className="whitespace-nowrap text-xs font-semibold text-slate-300">Sin factura</span>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Datos del cliente */}
                    <div className="order-3 min-w-0 bg-white rounded-[2rem] md:rounded-[2.5rem] p-5 md:p-8 border border-slate-100 shadow-sm">
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-sm mb-6">Cliente</Typography>
                        <div className="space-y-4">
                            <div>
                                <span className="text-xs font-semibold text-slate-500 block">Nombre</span>
                                <span className="text-sm font-bold text-slate-700 break-words">{data.cliente}</span>
                            </div>
                            <div>
                                <span className="text-xs font-semibold text-slate-500 block">Casillero</span>
                                <span className="text-sm font-mono font-bold text-primary break-all">{data.casillero}</span>
                            </div>
                            {data.consolidationUuid && (
                                <div>
                                    <span className="text-xs font-semibold text-slate-500 block">Orden de envío</span>
                                    {orderInfo && (
                                        <div className="mt-1"><Badge tone={orderInfo.tone}>{orderInfo.label}</Badge></div>
                                    )}
                                    <Button
                                        variant={ButtonVariant.GHOST}
                                        onClick={() => router.push(`/admin/shipment-orders/${data.consolidationUuid}`)}
                                        className="mt-1"
                                    >
                                        Ver orden
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface FinanceRowProps {
    label: string;
    value: string;
    isHighlight?: boolean;
}

const FinanceRow = ({ label, value, isHighlight }: FinanceRowProps) => (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <span className={`text-sm shrink-0 ${isHighlight ? 'text-slate-300 font-bold' : 'text-slate-400 font-medium'}`}>{label}</span>
        <span className={`text-sm font-bold text-right ml-auto whitespace-nowrap ${isHighlight ? 'text-primary' : 'text-slate-200'}`}>{value}</span>
    </div>
);
