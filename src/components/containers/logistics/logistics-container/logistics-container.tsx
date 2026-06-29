import React from 'react';
import { useRouter } from 'next/router';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Search, User, Calendar, Plus, Box } from 'lucide-react';
import { DateRangeFilter } from '@/components/common/date-range-filter/date-range-filter';
import { usePackages } from './use-logistics';
import { Column, NewTable } from '@/components/common/new-table/new-table';

// --- Sub-componente interno para las métricas rápidas ---
const MetricItem = ({ label, value, color, icon }: { label: string; value: number | string; color: string; icon: React.ReactNode }) => {
    const textColors: Record<string, string> = {
        blue: 'text-amber-600 border-amber-100 bg-amber-50/50',
        amber: 'text-amber-600 border-amber-100 bg-amber-50/50',
        emerald: 'text-emerald-600 border-emerald-100 bg-emerald-50/50'
    };

    return (
        <div className="flex items-center gap-3 group cursor-default">
            <div className={`p-2.5 rounded-xl border transition-transform group-hover:scale-110 ${textColors[color]}`}>
                {icon}
            </div>
            <div className="flex flex-col">
                <span className="text-[14px] font-black text-slate-800 leading-none">{value}</span>
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight mt-1">{label}</span>
            </div>
        </div>
    );
};

export const LogisticsContainer: React.FC = () => {
    const router = useRouter();
    const PAGE_SIZE = 7;

    const {
        packages, isLoading, meta,
        handlePageChange, handleSearch,
        viewMode, setViewMode,
        statusFilter, setStatusFilter,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
    } = usePackages(PAGE_SIZE);

    const columns: Column[] = [
        {
            header: 'Tracking / ID',
            accessor: 'tracking_number',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-amber-600 italic font-black text-[10px]">#{row.id_paquete || row.id?.substring(0, 8)}</span>
                    <span className="font-mono text-slate-600 text-[11px] uppercase font-bold tracking-tight">{row.tracking_number}</span>
                </div>
            )
        },
        {
            header: 'Cliente',
            accessor: 'customer',
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <User size={12} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-700 font-bold text-[11px] leading-none">
                            {row.first_name} {row.last_name}
                        </span>
                        <span className="text-[9px] font-black text-amber-400 mt-1 uppercase tracking-widest">
                            {row.customer_code}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Info. Envío',
            accessor: 'package_type',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-slate-400 uppercase">{row.package_type || 'AÉREO'}</span>
                    <div className="flex items-center gap-1 text-slate-400 mt-0.5">
                        <Calendar size={10} />
                        <span className="text-[10px] font-medium">{new Date(row.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            )
        },
        {
            header: 'Peso',
            accessor: 'weight_lb',
            render: (row) => (
                <div className="flex items-baseline gap-1 bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 inline-flex">
                    <span className="text-slate-900 font-black text-xs">{row.weight_lb}</span>
                    <span className="text-[8px] font-bold text-slate-400">LBS</span>
                </div>
            )
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (row) => {
                const statusStyles: Record<string, string> = {
                    'PANAMA':     'bg-amber-50 text-amber-600 border-amber-100',
                    'EN_TRAMITE': 'bg-blue-50 text-blue-600 border-blue-100',
                    'ENTREGADO':  'bg-emerald-50 text-emerald-600 border-emerald-100',
                };
                const statusLabels: Record<string, string> = {
                    'PANAMA':     'En Panamá',
                    'EN_TRAMITE': 'En Trámite',
                    'ENTREGADO':  'Entregado',
                };
                return (
                    <span className={`px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${statusStyles[row.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                        {statusLabels[row.status] || row.status}
                    </span>
                );
            }
        }
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

            {/* ACTION BAR: MÉTRICAS + BOTÓN CREATE */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm">

                {/* Métricas Compactas */}
                <div className="flex flex-1 items-center justify-around md:justify-start md:gap-16 px-4">
                    <MetricItem
                        label="Total Paquetes"
                        value={meta.total || 0}
                        color="blue"
                        icon={<Box size={14} />}
                    />
                    <div className="w-px h-8 bg-slate-100 hidden md:block" />
                    {/* <MetricItem
                        label="En Miami"
                        value={meta.totalMiami || 0}
                        color="amber"
                        icon={<Anchor size={14} />}
                    />
                    <div className="w-px h-8 bg-slate-100 hidden md:block" />
                    <MetricItem
                        label="Entregados"
                        value={meta.totalDelivered || 0}
                        color="emerald"
                        icon={<CheckCircle2 size={14} />}
                    /> */}
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    <button
                        onClick={() => router.push('/admin/logistics/create')}
                        className="bg-slate-900 hover:bg-slate-800 text-white pl-6 pr-4 py-3 rounded-[1.8rem] flex items-center justify-between gap-6 transition-all group shadow-lg active:scale-95"
                    >
                        <span className="text-[10px] font-black uppercase tracking-[0.15em]">Nuevo Registro</span>
                        <div className="bg-white/20 p-2 rounded-full group-hover:bg-white/30 transition-colors">
                            <Plus size={16} strokeWidth={3} />
                        </div>
                    </button>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Fila principal: toggle + search + período */}
                <div className="flex items-center gap-3 p-4 border-b border-slate-50">
                    {/* Toggle Activos / Historial */}
                    <div className="flex gap-0.5 bg-slate-100/70 p-1 rounded-xl flex-shrink-0">
                        <button
                            onClick={() => setViewMode('activos')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${viewMode === 'activos'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Activos
                        </button>
                        <button
                            onClick={() => setViewMode('historial')}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all whitespace-nowrap ${viewMode === 'historial'
                                ? 'bg-white text-emerald-600 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600'
                            }`}
                        >
                            Historial
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
                        <input
                            type="text"
                            placeholder="Tracking, código o nombre..."
                            className="w-full bg-slate-50 pl-9 pr-4 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-sm"
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    {/* Período — solo desktop */}
                    <div className="hidden sm:flex flex-shrink-0">
                        <DateRangeFilter
                            from={dateFrom} to={dateTo}
                            onFromChange={setDateFrom} onToChange={setDateTo}
                            onClear={() => { setDateFrom(''); setDateTo(''); }}
                        />
                    </div>
                </div>

                {/* Fila de filtros de estado — solo en modo activos */}
                {viewMode === 'activos' && (
                    <div className="px-4 py-2.5 overflow-x-auto">
                        <div className="flex gap-1">
                            {[
                                { value: 'PANAMA',     label: 'En Panamá' },
                                { value: 'EN_TRAMITE', label: 'En Trámite' },
                                { value: 'ALL',        label: 'Todos' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setStatusFilter(value)}
                                    className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all whitespace-nowrap ${statusFilter === value
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Período mobile */}
                <div className="sm:hidden px-4 pb-3">
                    <DateRangeFilter
                        from={dateFrom} to={dateTo}
                        onFromChange={setDateFrom} onToChange={setDateTo}
                        onClear={() => { setDateFrom(''); setDateTo(''); }}
                    />
                </div>
            </div>

            {/* CARDS (mobile) */}
            <div className="flex flex-col gap-3 md:hidden">
                {isLoading ? (
                    Array.from({ length: PAGE_SIZE }).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-20" />
                    ))
                ) : packages.map((pkg) => {
                    const statusStyles: Record<string, string> = {
                        'PANAMA':     'bg-amber-50 text-amber-600 border-amber-100',
                        'EN_TRAMITE': 'bg-blue-50 text-blue-600 border-blue-100',
                        'ENTREGADO':  'bg-emerald-50 text-emerald-600 border-emerald-100',
                    };
                    const statusLabels: Record<string, string> = {
                        'PANAMA': 'En Panamá', 'EN_TRAMITE': 'En Trámite', 'ENTREGADO': 'Entregado',
                    };
                    return (
                        <button
                            key={pkg.uuid}
                            onClick={() => router.push(`/admin/logistics/${pkg.uuid}`)}
                            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex items-center justify-between gap-3 hover:border-amber-100 transition-all active:scale-[0.99]"
                        >
                            <div className="flex-1 min-w-0">
                                <p className="font-mono text-slate-600 text-xs font-bold uppercase truncate">{pkg.tracking_number}</p>
                                <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{pkg.first_name} {pkg.last_name}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(pkg.created_at).toLocaleDateString('es-CR')} · {pkg.weight_lb} lb</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider ${statusStyles[pkg.status] || 'bg-slate-50 text-slate-500 border-slate-200'}`}>
                                    {statusLabels[pkg.status] || pkg.status}
                                </span>
                                <span className="text-[10px] font-mono text-amber-400 uppercase">{pkg.customer_code}</span>
                            </div>
                        </button>
                    );
                })}
                {meta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-2">
                        <button
                            onClick={() => handlePageChange(Math.max(1, meta.page - 1))}
                            disabled={meta.page === 1}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-slate-400 font-bold">{meta.page} / {meta.totalPages}</span>
                        <button
                            onClick={() => handlePageChange(Math.min(meta.totalPages, meta.page + 1))}
                            disabled={meta.page === meta.totalPages}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* TABLA PRINCIPAL (tablet+) */}
            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                <NewTable
                    data={packages}
                    columns={columns}
                    isLoading={isLoading}
                    totalRows={meta.total}
                    currentPage={meta.page}
                    totalPages={meta.totalPages}
                    onPageChange={handlePageChange}
                    onRowClick={(item) => router.push(`/admin/logistics/${item.uuid}`)}
                    itemsPerPage={PAGE_SIZE}
                />
            </div>
        </div>
    );
};

export default LogisticsContainer;