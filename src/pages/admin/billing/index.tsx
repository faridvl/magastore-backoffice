import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';

/**
 * BillingPage: Sistema de Liquidación y Reporte de Ganancias.
 * Incluye filtros temporales, búsqueda y desglose de rentabilidad.
 */

// Configuración de Tarifas
const TARIFA_POR_LIBRA = 5.00;
const COSTO_POR_LIBRA = 2.50;

// Mock con fechas reales para probar los filtros
const MOCK_BILLING = [
    { id: 101, client: 'Juan Pérez', weight: 5.2, paid: false, date: '2026-02-21', tracking: '1ZF4W440346171903' },
    { id: 102, client: 'María López', weight: 1.5, paid: true, date: '2026-02-15', tracking: 'UPS-992100234' },
    { id: 103, client: 'Carlos Ruiz', weight: 10.0, paid: false, date: '2026-01-10', tracking: 'AMZ-44219902' },
    { id: 104, client: 'Ana Belén', weight: 3.2, paid: true, date: '2026-02-22', tracking: 'FEDEX-102993' },
];

const BillingPage: React.FC = () => {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');
    const [timeRange, setTimeRange] = useState<'all' | 'week' | 'month'>('all');
    const [selectedClient, setSelectedClient] = useState<typeof MOCK_BILLING[0] | null>(null);

    // --- LÓGICA DE FILTRADO ---
    const filteredData = useMemo(() => {
        const now = new Date();
        return MOCK_BILLING.filter(item => {
            const itemDate = new Date(item.date);
            const matchesSearch = item.client.toLowerCase().includes(search.toLowerCase());
            const matchesStatus = statusFilter === 'all' ? true : statusFilter === 'paid' ? item.paid : !item.paid;

            let matchesTime = true;
            if (timeRange === 'week') {
                const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesTime = itemDate >= oneWeekAgo;
            } else if (timeRange === 'month') {
                matchesTime = itemDate.getMonth() === now.getMonth() && itemDate.getFullYear() === now.getFullYear();
            }

            return matchesSearch && matchesStatus && matchesTime;
        });
    }, [search, statusFilter, timeRange]);

    // --- CÁLCULOS ---
    const totalWeight = filteredData.reduce((acc, curr) => acc + curr.weight, 0);
    const totalRevenue = totalWeight * TARIFA_POR_LIBRA;
    const netProfit = totalWeight * (TARIFA_POR_LIBRA - COSTO_POR_LIBRA);

    return (
        <>
            <Head><title>Cobros | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Gestión de Cobros">

                {/* --- HEADER DE MÉTRICAS --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <MetricCard title="Total por Cobrar" value={`$${totalRevenue.toFixed(2)}`} sub={`Sobre ${totalWeight} lbs`} color="blue" />
                    <MetricCard title="Ganancia Estimada" value={`$${netProfit.toFixed(2)}`} sub="Neto tras flete" color="green" />
                    <MetricCard title="Eficiencia de Cobro" value={`${((filteredData.filter(d => d.paid).length / filteredData.length) * 100 || 0).toFixed(0)}%`} sub="Paquetes liquidados" color="purple" />
                </div>

                {/* --- BARRA DE HERRAMIENTAS (FILTROS) --- */}
                <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-sm mb-8 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[250px]">
                        <label className="text-[11px] font-black text-neutral-400 uppercase ml-2 mb-1 block">Búsqueda rápida</label>
                        <input
                            type="text"
                            placeholder="Buscar por cliente..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-neutral-50 border-none rounded-2xl px-5 py-3 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                        />
                    </div>

                    <div>
                        <label className="text-[11px] font-black text-neutral-400 uppercase ml-2 mb-1 block">Periodo</label>
                        <select
                            value={timeRange}
                            onChange={(e) => setTimeRange(e.target.value as any)}
                            className="bg-neutral-50 border-none rounded-2xl px-5 py-3 font-bold text-neutral-700 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                        >
                            <option value="all">Todo el tiempo</option>
                            <option value="week">Esta Semana</option>
                            <option value="month">Este Mes</option>
                        </select>
                    </div>

                    <div className="bg-neutral-50 p-1.5 rounded-2xl flex">
                        {['all', 'pending', 'paid'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setStatusFilter(f as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-tighter transition-all ${statusFilter === f ? 'bg-white shadow-sm text-blue-600' : 'text-neutral-400 hover:text-neutral-600'
                                    }`}
                            >
                                {f === 'all' ? 'Todos' : f === 'paid' ? 'Pagados' : 'Pendientes'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* --- TABLA PRINCIPAL --- */}
                <div className="bg-white rounded-[2.5rem] border border-neutral-100 shadow-sm overflow-hidden">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-neutral-50/50">
                                <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Detalle Cliente</th>
                                <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Peso</th>
                                <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Total a Pagar</th>
                                <th className="p-6 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Estado</th>
                                <th className="p-6"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-50">
                            {filteredData.map((item) => (
                                <tr key={item.id} className="hover:bg-neutral-50/30 transition-all group">
                                    <td className="p-6">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-neutral-800 text-lg leading-none mb-1">{item.client}</span>
                                            <span className="text-xs font-mono text-neutral-400">{item.tracking}</span>
                                        </div>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className="font-black text-neutral-700">{item.weight} <span className="text-[10px] text-neutral-400">lb</span></span>
                                    </td>
                                    <td className="p-6">
                                        <span className="text-xl font-black text-blue-600">${(item.weight * TARIFA_POR_LIBRA).toFixed(2)}</span>
                                    </td>
                                    <td className="p-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${item.paid ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 animate-pulse'
                                            }`}>
                                            {item.paid ? 'Liquidado' : 'Pendiente'}
                                        </span>
                                    </td>
                                    <td className="p-6 text-right">
                                        <button
                                            onClick={() => setSelectedClient(item)}
                                            className="bg-neutral-800 text-white p-2 rounded-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110"
                                        >
                                            <ChevronRightIcon />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- MODAL DE DETALLE (Overlay) --- */}
                {selectedClient && (
                    <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-[3rem] p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200">
                            <h3 className="text-2xl font-black text-neutral-800 mb-2">{selectedClient.client}</h3>
                            <p className="text-neutral-400 text-sm mb-6 uppercase font-bold">Resumen de Liquidación</p>

                            <div className="space-y-4 mb-8">
                                <DetailRow label="Peso Total" value={`${selectedClient.weight} lb`} />
                                <DetailRow label="Tarifa x Libra" value={`$${TARIFA_POR_LIBRA.toFixed(2)}`} />
                                <DetailRow label="Tracking" value={selectedClient.tracking} />
                                <div className="pt-4 border-t border-dashed border-neutral-200 flex justify-between items-center">
                                    <span className="font-bold text-neutral-800">Total Final</span>
                                    <span className="text-3xl font-black text-blue-600">${(selectedClient.weight * TARIFA_POR_LIBRA).toFixed(2)}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setSelectedClient(null)}
                                    className="py-4 bg-neutral-100 text-neutral-500 rounded-2xl font-bold hover:bg-neutral-200 transition-all"
                                >
                                    Cerrar
                                </button>
                                <button className="py-4 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">
                                    Cobrar Ahora
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </DashboardLayout>
        </>
    );
};

// --- COMPONENTES AUXILIARES ---

const MetricCard = ({ title, value, sub, color }: { title: string, value: string, sub: string, color: 'blue' | 'green' | 'purple' }) => {
    const colors = {
        blue: 'bg-blue-50 border-blue-100 text-blue-600',
        green: 'bg-green-50 border-green-100 text-green-700',
        purple: 'bg-purple-50 border-purple-100 text-purple-600'
    };
    return (
        <div className={`p-6 rounded-[2rem] border shadow-sm ${colors[color]}`}>
            <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">{title}</p>
            <p className="text-4xl font-black mb-1">{value}</p>
            <p className="text-xs font-bold opacity-60">{sub}</p>
        </div>
    );
};

const DetailRow = ({ label, value }: { label: string, value: string }) => (
    <div className="flex justify-between items-center text-sm">
        <span className="text-neutral-400 font-medium">{label}</span>
        <span className="text-neutral-800 font-bold">{value}</span>
    </div>
);

const ChevronRightIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
);

export default BillingPage;