import React from 'react';
import Link from 'next/link';
import { Search, Truck, User, DollarSign, Package } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { usePackages } from './use-packages';

const STATUS_LABELS: Record<string, string> = {
    MIAMI: 'En Miami',
    TRANSITO: 'En Tránsito',
    ADUANA: 'En Aduana',
    BODEGA_CR: 'Bodega CR',
    ENTREGADO: 'Entregado',
};

export const PackagesContainer: React.FC = () => {
    const {
        input,
        setInput,
        data,
        isFetching,
        isError,
        error,
        searchTerm,
        isPagado,
        sinFactura,
        handleSearch,
    } = usePackages();

    return (
        <div className="max-w-4xl mx-auto space-y-8">

            {/* Buscador */}
            <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] shadow-xl border border-neutral-100 dark:border-neutral-800">
                <div className="mb-6 text-center">
                    <Typography variant={TypographyVariant.SUBTITLE}>Rastreo de Operaciones</Typography>
                    <Typography variant={TypographyVariant.HELPER}>
                        Ingresa el número de tracking para ver información logística y financiera.
                    </Typography>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group flex-1">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pegar número de tracking aquí..."
                            className="w-full p-5 pl-14 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent focus:border-amber-500 rounded-3xl outline-none transition-all font-mono text-base"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-amber-500" size={22} />
                    </div>
                    <button
                        type="submit"
                        disabled={isFetching}
                        className="bg-slate-900 text-white px-8 py-4 rounded-3xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg disabled:opacity-60 whitespace-nowrap"
                    >
                        {isFetching ? 'Buscando...' : 'Rastrear'}
                    </button>
                </form>
            </div>

            {/* Error */}
            {isError && searchTerm && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl text-sm font-medium">
                    {(error as Error)?.message || 'No se encontró el paquete.'}
                </div>
            )}

            {/* Resultado */}
            {data && (
                <div className="space-y-6">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-amber-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-amber-100">
                        <div className="flex items-center gap-5">
                            <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                <Truck size={32} />
                            </div>
                            <div>
                                <p className="text-xs font-black uppercase text-amber-100 tracking-[0.2em] mb-1">Estado Actual</p>
                                <h2 className="text-2xl font-black">
                                    {STATUS_LABELS[data.status] ?? data.status}
                                </h2>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-xs font-bold text-amber-200 uppercase mb-1">Tracking</p>
                            <p className="font-mono text-sm">{data.tracking_number}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Cliente */}
                        <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-neutral-100 dark:border-neutral-800 pb-4">
                                <User className="text-amber-600" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Cliente / Dueño</Typography>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Nombre</p>
                                    <p className="text-lg font-bold text-neutral-800 dark:text-neutral-100">
                                        {data.first_name} {data.last_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-neutral-400 uppercase">Casillero</p>
                                    <p className="font-black text-amber-600">{data.customer_code ?? '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Financiero */}
                        <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                                <DollarSign className="text-green-400" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Liquidación Admin</Typography>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-neutral-400">
                                        {sinFactura ? 'Sin factura aún' : 'Total Facturado:'}
                                    </span>
                                    <span className={`text-xl font-black ${sinFactura ? 'text-neutral-500' : 'text-white'}`}>
                                        {sinFactura
                                            ? '—'
                                            : `₡${Number(data.total_amount_crc).toLocaleString('es-CR')}`}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-xs text-neutral-400">Estado de Pago:</span>
                                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${
                                        sinFactura
                                            ? 'bg-neutral-700 text-neutral-400'
                                            : isPagado
                                                ? 'bg-green-500/20 text-green-400'
                                                : 'bg-orange-500/20 text-orange-400'
                                    }`}>
                                        {sinFactura ? 'SIN FACTURA' : isPagado ? 'PAGADO' : 'PENDIENTE'}
                                    </span>
                                </div>
                                {data.delivery_method && (
                                    <div className="flex justify-between items-center pt-2 border-t border-neutral-800">
                                        <span className="text-xs text-neutral-500">Método de entrega:</span>
                                        <span className="text-xs text-neutral-300">{data.delivery_method}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Detalle técnico */}
                    <div className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800 flex flex-wrap gap-8 justify-around">
                        <div className="text-center">
                            <p className="text-[10px] font-black text-neutral-400 uppercase">Peso Real</p>
                            <p className="font-bold">{data.weight_lb ? `${data.weight_lb} lbs` : '—'}</p>
                        </div>
                        <div className="text-center">
                            <p className="text-[10px] font-black text-neutral-400 uppercase">UUID</p>
                            <p className="font-mono text-xs text-neutral-500">{data.uuid}</p>
                        </div>
                    </div>

                    {/* Link al detalle completo */}
                    <div className="flex justify-end">
                        <Link
                            href={`/admin/logistics/${data.uuid}`}
                            className="flex items-center gap-2 text-sm font-bold text-amber-600 hover:text-amber-700 underline underline-offset-2"
                        >
                            <Package size={16} />
                            Ver detalle completo del paquete
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};
