import React from 'react';
import { useRouter } from 'next/router';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Search, Package, Anchor, CheckCircle2, User, Calendar } from 'lucide-react';
import { usePackages } from './use-logistics';
import { Column, NewTable } from '@/components/common/new-table/new-table';

export const LogisticsContainer: React.FC = () => {
    const router = useRouter();
    const PAGE_SIZE = 7;
    // Ajustamos a 5 rows para que la vista sea compacta
    const {
        packages, isLoading, meta,
        handlePageChange, handleSearch,
        statusFilter, setStatusFilter
    } = usePackages(PAGE_SIZE);

    const columns: Column[] = [
        {
            header: 'Tracking / ID',
            accessor: 'tracking_number',
            render: (row) => (
                <div className="flex flex-col">
                    <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="text-primary italic leading-none">
                        #{row.id_paquete || row.id}
                    </Typography>
                    <Typography variant={TypographyVariant.CAPTION} className="font-mono text-slate-400 mt-1 uppercase tracking-tighter">
                        {row.tracking_number || row.tracking}
                    </Typography>
                </div>
            )
        },
        {
            header: 'Cliente',
            accessor: 'customer',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User size={14} />
                    </div>
                    <div className="flex flex-col">
                        <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="text-slate-700 text-xs">
                            {row.customer_name || 'Consumidor Final'}
                        </Typography>
                        <Typography variant={TypographyVariant.OVERLINE} className="text-[9px] opacity-60">
                            {row.customer_code || row.codigo_cliente}
                        </Typography>
                    </div>
                </div>
            )
        },
        {
            header: 'Info. Paquete',
            accessor: 'type',
            render: (row) => (
                <div className="flex flex-col">
                    <Typography variant={TypographyVariant.CAPTION} className="font-bold text-slate-600 uppercase">
                        {row.tipo_paquete || 'General'}
                    </Typography>
                    <div className="flex items-center gap-1 text-slate-400">
                        <Calendar size={10} />
                        <Typography variant={TypographyVariant.OVERLINE} className="text-[9px]">
                            {row.fecha_llegada_pty || 'Sin fecha'}
                        </Typography>
                    </div>
                </div>
            )
        },
        {
            header: 'Peso',
            accessor: 'weight_lb',
            render: (row) => (
                <div className="bg-slate-50 px-3 py-1 rounded-lg border border-slate-100 inline-flex items-baseline gap-1">
                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-700">
                        {row.weight_lb || row.peso_lb}
                    </Typography>
                    <Typography variant={TypographyVariant.OVERLINE} className="text-[9px] font-black text-slate-400">LBS</Typography>
                </div>
            )
        },
        {
            header: 'Estado',
            accessor: 'status',
            render: (row) => (
                <span className={`px-3 py-1.5 rounded-full border text-[9px] font-black uppercase tracking-wider ${row.status === 'MIAMI' || row.status === 'RECIBIDO' ? 'bg-blue-50 text-blue-600 border-blue-200' :
                    row.status === 'ENTREGADO' ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
                        'bg-slate-100 text-slate-500 border-slate-200'
                    }`}>
                    {row.status}
                </span>
            )
        }
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500">
            {/* Cards de Resumen con diseño más "Dashboard" */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <SummaryCard icon={<Package size={22} />} label="Total Registros" value={meta.total} color="blue" />
                <SummaryCard icon={<Anchor size={22} />} label="En Bodega Miami" value={packages.filter((p: any) => p.status === 'MIAMI').length} color="amber" />
                <SummaryCard icon={<CheckCircle2 size={22} />} label="Páginas Disponibles" value={meta.totalPages} color="emerald" />
            </div>

            {/* Toolbar: Búsqueda y Filtros Segmentados */}
            <div className="bg-white p-4 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <input
                        type="text"
                        placeholder="Buscar por tracking, ID o cliente..."
                        className="w-full bg-slate-50 border-none pl-12 pr-4 py-3.5 rounded-2xl outline-none focus:ring-2 focus:ring-primary/20 transition-all text-sm"
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                </div>

                <div className="flex gap-1 bg-slate-100 p-1.5 rounded-2xl w-full md:w-auto">
                    {['ALL', 'MIAMI', 'ENTREGADO'].map((s) => (
                        <button
                            key={s}
                            onClick={() => setStatusFilter(s)}
                            className={`flex-1 md:flex-none px-6 py-2.5 rounded-xl text-[10px] font-black transition-all ${statusFilter === s
                                ? 'bg-white text-primary shadow-md'
                                : 'text-slate-500 hover:bg-slate-200/50'
                                }`}
                        >
                            {s === 'ALL' ? 'TODOS' : s}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tabla con Densidad Ajustada */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
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

const SummaryCard = ({ icon, label, value, color }: any) => (
    <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-md transition-shadow flex items-center gap-5">
        <div className={`h-14 w-14 rounded-2xl bg-${color}-50 text-${color}-600 flex items-center justify-center`}>
            {icon}
        </div>
        <div>
            <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-black tracking-widest">{label}</Typography>
            <Typography variant={TypographyVariant.HEADER} className="text-slate-900 leading-none mt-1" as="h3">
                {value}
            </Typography>
        </div>
    </div>
);