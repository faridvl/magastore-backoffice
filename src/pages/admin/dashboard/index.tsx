import React from 'react';
import Head from 'next/head';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell
} from 'recharts';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { TrendingUp, Package, Clock, Users, Eye, ArrowRight } from 'lucide-react';

// --- MOCKS DE ESTADÍSTICAS ---
const MONTHLY_REVENUE_DATA = [
    { name: 'Sep', revenue: 180000, cost: 120000 },
    { name: 'Oct', revenue: 220000, cost: 140000 },
    { name: 'Nov', revenue: 350000, cost: 210000 },
    { name: 'Dic', revenue: 480000, cost: 280000 },
    { name: 'Ene', revenue: 245000, cost: 150000 },
    { name: 'Feb', revenue: 310000, cost: 190000 },
];

const TOP_CLIENTS_DATA = [
    { name: 'S. Jimenez', total: 85000 },
    { name: 'E. Guzman', total: 62000 },
    { name: 'J. Montero', total: 45000 },
    { name: 'M. Arce', total: 38000 },
];

const DASHBOARD_STATS = [
    { label: 'Paquetes este mes', value: '142', icon: Package, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Por Cobrar', value: '₡435,000', icon: Clock, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: 'Ganancia Neta (Feb)', value: '₡245,000', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Clientes Activos', value: '48', icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
];

const RECENT_ACTIVITY = [
    { id: 1, client: 'Sebastian Jimenez', tracking: '0000088516...', status: 'Entregado', total: '₡16,350' },
    { id: 2, client: 'Eduardo Guzman', tracking: '4203319194...', status: 'En Aduana', total: '₡8,400' },
    { id: 3, client: 'Juan Jose Montero', tracking: 'GFUS010290...', status: 'Notificado', total: '₡12,100' },
];

const DashboardPage: React.FC = () => {
    return (
        <>
            <Head><title>Panel de Control | Magastore</title></Head>
            <DashboardLayout isMainPage contentStyle={BoxedLayoutStyle.FULL} title="Inicio">

                {/* --- NOTA PARA TU AMIGO --- */}
                <div className="relative mb-8 group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-[2rem] blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                    <div className="relative bg-white border border-blue-100 p-6 rounded-[2rem] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200 animate-bounce">
                                <Eye size={28} />
                            </div>
                            <div>
                                <h4 className="text-neutral-900 font-black text-lg tracking-tight">¡Hey! Echa un vistazo a la vista del cliente</h4>
                                <p className="text-neutral-500 text-sm font-medium">He preparado una demo para que veas cómo tus clientes rastrean sus paquetes.</p>
                            </div>
                        </div>
                        <a
                            href="https://magastore-backoffice.vercel.app/tracking"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-neutral-900 hover:bg-blue-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl shadow-neutral-200 hover:shadow-blue-100 group"
                        >
                            Ir al Rastreo de Clientes
                            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                        </a>
                    </div>
                </div>

                {/* 1. Grid de Estadísticas Rápidas */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {DASHBOARD_STATS.map((stat, index) => (
                        <div key={index} className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow">
                            <div className={`h-12 w-12 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
                                <stat.icon size={24} />
                            </div>
                            <p className="text-neutral-500 text-sm font-bold uppercase tracking-wider">{stat.label}</p>
                            <h3 className="text-2xl font-black text-neutral-900 mt-1">{stat.value}</h3>
                        </div>
                    ))}
                </div>

                {/* 2. Sección de Gráficos Principales */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="font-black text-neutral-800 tracking-tight">Crecimiento de Ganancias</h3>
                                <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">Comparativa Ingresos vs Costos</p>
                            </div>
                            <div className="flex gap-4 text-[10px] font-black uppercase">
                                <span className="flex items-center gap-1.5 text-blue-600"><div className="h-2 w-2 rounded-full bg-blue-600" /> Ingreso</span>
                                <span className="flex items-center gap-1.5 text-neutral-300"><div className="h-2 w-2 rounded-full bg-neutral-300" /> Costo</span>
                            </div>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={MONTHLY_REVENUE_DATA}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#a3a3a3' }} dy={10} />
                                    <YAxis hide />
                                    <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="cost" stroke="#d4d4d4" strokeWidth={2} fill="transparent" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="mb-6">
                            <h3 className="font-black text-neutral-800 tracking-tight">Top Clientes</h3>
                            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">Basado en volumen de ganancias</p>
                        </div>
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={TOP_CLIENTS_DATA} layout="vertical" margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700, fill: '#404040' }} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px' }} />
                                    <Bar dataKey="total" fill="#2563eb" radius={[0, 10, 10, 0]} barSize={30}>
                                        {TOP_CLIENTS_DATA.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={index === 0 ? '#1e3a8a' : '#2563eb'} fillOpacity={1 - index * 0.2} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                        <div className="p-6 border-b border-neutral-50 flex justify-between items-center">
                            <h3 className="font-black text-neutral-800 tracking-tight">Actividad de Paquetes</h3>
                            <button className="text-blue-600 text-[11px] font-black uppercase tracking-widest hover:bg-blue-50 px-4 py-2 rounded-xl transition-all">Ver Historial Completo</button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-neutral-50 text-[11px] font-black text-neutral-400 uppercase">
                                    <tr>
                                        <th className="px-6 py-4">Cliente</th>
                                        <th className="px-6 py-4">Tracking</th>
                                        <th className="px-6 py-4">Estado</th>
                                        <th className="px-6 py-4">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50">
                                    {RECENT_ACTIVITY.map((item) => (
                                        <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors cursor-pointer group">
                                            <td className="px-6 py-4 font-bold text-neutral-700 text-sm">{item.client}</td>
                                            <td className="px-6 py-4 font-mono text-xs text-neutral-400 group-hover:text-blue-600 transition-colors">{item.tracking}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${item.status === 'Entregado' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                    {item.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 font-black text-neutral-900 text-sm">{item.total}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="bg-neutral-900 rounded-3xl p-8 text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-xl font-black mb-2">Calculadora Rápida</h3>
                            <p className="text-neutral-500 text-sm mb-6 font-medium">Cotización inmediata al cliente</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black uppercase text-neutral-500 mb-2 block tracking-widest">Peso en Libras (LB)</label>
                                    <input type="number" placeholder="0.00" className="w-full bg-neutral-800 border-none rounded-2xl p-4 text-white placeholder:text-neutral-600 focus:ring-2 focus:ring-blue-500 transition-all font-bold" />
                                </div>
                                <div className="pt-6 border-t border-neutral-800">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs font-bold text-neutral-500 uppercase">A Cobrar</span>
                                        <div className="text-right">
                                            <span className="block text-2xl font-black text-blue-400">₡0.00</span>
                                            <span className="text-[10px] font-black text-neutral-600 uppercase">Tarifa: $6/lb</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-2xl transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 group">
                                    Registrar Ingreso
                                    <Package size={18} className="group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-5 text-white">
                            <Package size={180} />
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default DashboardPage;