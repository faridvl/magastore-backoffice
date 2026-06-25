import React from 'react';
import { useRouter } from 'next/router';
import { Truck, ChevronLeft, History, MapPin, Edit3, Save, DollarSign, AlertCircle } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { usePackageDetailContainer } from './use-logistics-detail';

export const PackageDetailContainer: React.FC = () => {
    const router = useRouter();
    const { uuid } = router.query;
    const {
        data, bitacora, calculos, isLoading, isError,
        isEditingFinancial, setIsEditingFinancial, handleSaveFinancial, updateField
    } = usePackageDetailContainer(uuid as string);

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            <Typography variant={TypographyVariant.BODY_BOLD} className="animate-pulse text-slate-400 uppercase tracking-widest">
                Obteniendo Información...
            </Typography>
        </div>
    );

    if (isError) return <div className="p-10 text-center text-red-500 font-bold">Error al cargar el paquete. Revisa el UUID.</div>;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-8 pb-20">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-col">
                    <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-primary transition-colors text-[10px] font-black uppercase tracking-widest mb-2">
                        <ChevronLeft size={14} /> Volver a logística
                    </button>
                    <Typography variant={TypographyVariant.HEADER} className="tracking-tighter">
                        Paquete <span className="text-primary italic">#{data.tracking.slice(-6)}</span>
                    </Typography>
                </div>

                <button
                    onClick={isEditingFinancial ? handleSaveFinancial : () => setIsEditingFinancial(true)}
                    className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all ${isEditingFinancial
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 scale-105'
                        : 'bg-slate-900 text-white hover:bg-slate-800'
                        }`}
                >
                    {isEditingFinancial ? <><Save size={16} /> Confirmar Cambios</> : <><Edit3 size={16} /> Editar Peso/Precios</>}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* COLUMNA IZQUIERDA: Info y Bitácora */}
                <div className="lg:col-span-2 space-y-8">

                    {/* CARD PRINCIPAL LOGÍSTICA */}
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2">Tracking Number Oficial</label>
                                    <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <Truck className="text-primary" size={18} />
                                        <span className="font-mono font-bold text-slate-700 break-all">{data.tracking}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-2xl border border-slate-100 bg-white">
                                        <label className="text-[9px] font-black text-slate-400 uppercase block mb-1">Peso Registrado</label>
                                        {isEditingFinancial ? (
                                            <div className="flex items-center gap-1 border-b-2 border-primary">
                                                <input
                                                    type="number"
                                                    value={data.peso}
                                                    onChange={(e) => updateField('peso', e.target.value)}
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
                                </div>
                            </div>

                            <div className="bg-amber-50/50 p-6 rounded-[2rem] border border-amber-100/50 flex flex-col">
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
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                        <Typography variant={TypographyVariant.BODY_BOLD} className="mb-10 flex items-center gap-2 uppercase tracking-widest text-xs">
                            <History size={18} className="text-primary" /> Historial de Movimientos
                        </Typography>

                        <div className="space-y-10 ml-4 border-l-2 border-slate-100 pl-8">
                            {bitacora.length > 0 ? bitacora.map((event) => (
                                <div key={event.id} className="relative">
                                    <div className="absolute -left-[41px] top-0 w-4 h-4 rounded-full bg-white border-4 border-primary shadow-sm" />
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
                <div className="space-y-6">
                    <div className="bg-slate-900 rounded-[3rem] p-8 text-white shadow-2xl relative overflow-hidden sticky top-8">
                        {/* Decoración de fondo */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-primary/10 rounded-full blur-3xl" />

                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-8">
                                <div className="p-2 bg-primary/20 rounded-lg text-primary">
                                    <DollarSign size={20} />
                                </div>
                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-white uppercase text-[10px] tracking-widest">
                                    Detalle de Cobro
                                </Typography>
                            </div>

                            <div className="space-y-5">
                                <FinanceRow label="Peso Final" value={`${data.peso} Lbs`} />
                                <FinanceRow label="Tarifa por Libra" value={`$${data.tarifaXLibre.toFixed(2)}`} />
                                <FinanceRow label="Flete Internacional" value={`$${calculos.fleteUSD.toFixed(2)}`} isHighlight />

                                <div className="h-px bg-white/5 my-2" />

                                <FinanceRow label="Tipo de Cambio" value={`₡${data.tipoCambio}`} />
                                <FinanceRow label="Envío Local (Correos)" value={`₡${data.costoEnvioCorreos.toLocaleString()}`} />

                                <div className="pt-8 border-t border-white/10 mt-6">
                                    <label className="text-[9px] font-black text-slate-500 uppercase block mb-2 tracking-widest">Total a cancelar</label>
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-4xl font-black italic tracking-tighter">₡{calculos.totalPagar.toLocaleString()}</span>
                                    </div>
                                    <div className="mt-4 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-lg w-fit">
                                        <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">{data.estadoPago}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Datos del Cliente (Mocks) */}
                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-xs uppercase tracking-widest mb-6">Información del Cliente</Typography>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase block">Nombre</label>
                                <span className="text-sm font-bold text-slate-700">{data.cliente}</span>
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-slate-400 uppercase block">Casillero</label>
                                <span className="text-sm font-mono font-bold text-primary">{data.casillero}</span>
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
    <div className="flex justify-between items-center">
        <span className={`text-xs ${isHighlight ? 'text-slate-300 font-bold' : 'text-slate-500 font-medium'} italic`}>{label}</span>
        <span className={`text-sm font-bold ${isHighlight ? 'text-primary' : 'text-slate-200'}`}>{value}</span>
    </div>
);