import { formatWeight } from '@/shared/utils/format';
import React from 'react';
import Link from 'next/link';
import { Search, Truck, User, DollarSign, Package } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { Badge } from '@/components/common/badge/badge';
import { BadgeTone, PAYMENT_STATUS_LABEL } from '@/shared/constants/status-labels';
import { ConsolidationPaymentStatus } from '@/types/logistics/logistics.types';
import { describePackageStatus } from '@/components/containers/logistics/logistics-labels';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { usePackages } from './use-packages';
import { formatCrc } from '@/shared/utils/format-crc';

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

    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();

    const paymentLabel = isPagado
        ? PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PAGADO]
        : PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PENDIENTE_PAGO];

    return (
        <div className="max-w-4xl mx-auto space-y-8">

            {/* Buscador */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800">
                <div className="mb-6 text-center">
                    <Typography variant={TypographyVariant.SUBTITLE}>Rastrear paquete</Typography>
                    <Typography variant={TypographyVariant.HELPER}>
                        Escribe el número de rastreo para ver dónde está y cuánto se cobró.
                    </Typography>
                </div>

                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                    <div className="relative group flex-1">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Pega el número de rastreo aquí..."
                            aria-label="Número de rastreo"
                            className="w-full min-h-[44px] p-5 pl-14 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-amber-500 rounded-3xl outline-none transition-all font-mono text-base"
                        />
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500" size={22} />
                    </div>
                    <Button
                        type="submit"
                        variant={ButtonVariant.PRIMARY}
                        disabled={isFetching}
                        className="px-8 whitespace-nowrap"
                    >
                        {isFetching ? 'Buscando...' : 'Rastrear paquete'}
                    </Button>
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
                                <p className="text-sm font-semibold text-amber-100 mb-1">Estado actual</p>
                                <h2 className="text-2xl font-black">
                                    {describePackageStatus(data.status).label}
                                </h2>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-amber-100 mb-1">Número de rastreo</p>
                            <p className="font-mono text-sm break-all">{data.tracking_number}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Cliente */}
                        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-100 dark:border-slate-800 pb-4">
                                <User className="text-amber-600" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Cliente</Typography>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Nombre</p>
                                    <p className="text-lg font-bold text-slate-800 dark:text-slate-100">
                                        {data.first_name} {data.last_name}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-slate-500">Casillero</p>
                                    <p className="font-black text-amber-600 whitespace-nowrap">{data.customer_code ?? '—'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Cobro */}
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                            <div className="flex items-center gap-3 mb-6 border-b border-slate-800 pb-4">
                                <DollarSign className="text-emerald-400" size={20} />
                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-white">Cobro</Typography>
                            </div>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-sm text-slate-400">
                                        {sinFactura ? 'Sin factura aún' : 'Total facturado'}
                                    </span>
                                    <span className={`whitespace-nowrap text-xl font-black ${sinFactura ? 'text-slate-500' : 'text-white'}`}>
                                        {sinFactura
                                            ? '—'
                                            : formatCrc(Number(data.total_amount_crc))}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center gap-3">
                                    <span className="text-sm text-slate-400">Estado de pago</span>
                                    {sinFactura ? (
                                        <Badge tone={BadgeTone.NEUTRAL}>Sin factura</Badge>
                                    ) : (
                                        <Badge tone={isPagado ? BadgeTone.SUCCESS : BadgeTone.WARNING}>{paymentLabel}</Badge>
                                    )}
                                </div>
                                {data.delivery_method && (
                                    <div className="flex justify-between items-center gap-3 pt-2 border-t border-slate-800">
                                        <span className="text-sm text-slate-400">Método de entrega</span>
                                        <span className="text-sm text-slate-300">{resolveDeliveryMethodLabel(data.delivery_method, deliveryMethodsData?.data)}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Peso */}
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex justify-center">
                        <div className="text-center">
                            <p className="text-xs font-semibold text-slate-500">Peso</p>
                            <p className="font-bold whitespace-nowrap">{formatWeight(data.weight_lb)}</p>
                        </div>
                    </div>

                    {/* Link al detalle completo */}
                    <div className="flex justify-end">
                        <Link
                            href={`/admin/logistics/${data.uuid}`}
                            className="flex items-center gap-2 min-h-[44px] text-sm font-bold text-amber-700 hover:text-amber-800 underline underline-offset-2"
                        >
                            <Package size={16} />
                            Ver detalle del paquete
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
};
