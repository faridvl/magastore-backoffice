import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    User, Phone, MapPin, Mail, Search,
    Package, TrendingUp, DollarSign, ChevronLeft
} from 'lucide-react';

// MOCK: Información del Cliente (Basado en CLIENTES.csv)
const CUSTOMER_INFO = {
    id: 'C-26',
    name: 'Sebastian Jimenez Valverde',
    whatsapp: '6204-8869',
    email: 's.jimenez@email.com',
    address: 'San José, Costa Rica',
    status: 'Activo',
    totalLbs: 154.5,
    totalSpent: 450000,
};

// MOCK: Historial de Compras/Paquetes (Basado en BD PAQUETES.csv)
const PURCHASE_HISTORY = [
    { id: 1, date: '2026-02-15', tracking: '00000885166052', weight: 3.5, total: 16350, status: 'Pagado' },
    { id: 2, date: '2026-01-10', tracking: '1ZF4W440034617', weight: 1.2, total: 8400, status: 'Pagado' },
    { id: 3, date: '2025-12-05', tracking: 'UUS5CV19337600', weight: 10.0, total: 52000, status: 'Pagado' },
    { id: 4, date: '2025-11-20', tracking: 'GFUS0102904764', weight: 5.0, total: 26000, status: 'Pagado' },
];

// MOCK: Estacionalidad de compra (Meses)
const SEASONALITY_DATA = [
    { month: 'Sep', lbs: 12 },
    { month: 'Oct', lbs: 18 },
    { month: 'Nov', lbs: 45 }, // Pico de Black Friday
    { month: 'Dic', lbs: 38 },
    { month: 'Ene', lbs: 15 },
    { month: 'Feb', lbs: 26 },
];

const CustomerDetailPage: React.FC = () => {
    const router = useRouter();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredHistory = useMemo(() => {
        return PURCHASE_HISTORY.filter(item =>
            item.tracking.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.status.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [searchTerm]);

    return (
        <>
            <Head><title>{CUSTOMER_INFO.name} | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Detalle de Cliente">

                {/* Botón Volver */}
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 font-bold text-xs uppercase tracking-widest mb-6 transition-colors"
                >
                    <ChevronLeft size={16} /> Volver a Clientes
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Columna Izquierda: Perfil y Stats */}
                    <div className="space-y-6">
                        {/* Card de Perfil */}
                        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm text-center">
                            <div className="h-24 w-24 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-black">
                                {CUSTOMER_INFO.id}
                            </div>
                            <h2 className="text-xl font-black text-neutral-800">{CUSTOMER_INFO.name}</h2>
                            <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-[10px] font-black uppercase mt-2 inline-block">
                                {CUSTOMER_INFO.status}
                            </span>

                            <div className="mt-8 space-y-4 text-left border-t border-neutral-50 pt-6">
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <Phone size={16} className="text-blue-500" /> {CUSTOMER_INFO.whatsapp}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <Mail size={16} className="text-blue-500" /> {CUSTOMER_INFO.email}
                                </div>
                                <div className="flex items-center gap-3 text-sm text-neutral-600">
                                    <MapPin size={16} className="text-blue-500" /> {CUSTOMER_INFO.address}
                                </div>
                            </div>
                        </div>

                        {/* Stats Acumuladas */}
                        <div className="bg-neutral-900 p-6 rounded-3xl text-white shadow-xl shadow-blue-900/20">
                            <p className="text-[10px] font-black uppercase text-neutral-500 mb-4 tracking-widest">Resumen Histórico</p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-neutral-400">Total Libras</p>
                                    <p className="text-xl font-black">{CUSTOMER_INFO.totalLbs} lb</p>
                                </div>
                                <div>
                                    <p className="text-xs text-neutral-400">Total Facturado</p>
                                    <p className="text-xl font-black text-blue-400">₡{CUSTOMER_INFO.totalSpent.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha: Gráfico e Historial */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Gráfico de Estacionalidad */}
                        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                            <div className="mb-6">
                                <h3 className="font-black text-neutral-800">Volumen de Compra por Mes</h3>
                                <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">Libras importadas mensualmente</p>
                            </div>
                            <div className="h-[250px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={SEASONALITY_DATA}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 700 }} dy={10} />
                                        <YAxis hide />
                                        <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
                                        <Bar dataKey="lbs" radius={[6, 6, 0, 0]} barSize={40}>
                                            {SEASONALITY_DATA.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.lbs > 30 ? '#2563eb' : '#d4d4d4'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Historial con Buscador */}
                        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-neutral-50 flex flex-col md:flex-row justify-between items-center gap-4">
                                <h3 className="font-black text-neutral-800">Historial de Paquetes</h3>
                                <div className="relative w-full md:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar por tracking..."
                                        className="w-full pl-10 pr-4 py-2 bg-neutral-50 border-none rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-neutral-50 text-[10px] font-black text-neutral-400 uppercase">
                                        <tr>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Tracking</th>
                                            <th className="px-6 py-4">Peso</th>
                                            <th className="px-6 py-4">Monto</th>
                                            <th className="px-6 py-4">Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50">
                                        {filteredHistory.map((item) => (
                                            <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-neutral-600">{item.date}</td>
                                                <td className="px-6 py-4 font-mono text-xs font-bold text-blue-600">{item.tracking}</td>
                                                <td className="px-6 py-4 text-sm font-bold">{item.weight} lb</td>
                                                <td className="px-6 py-4 text-sm font-black italic">₡{item.total.toLocaleString()}</td>
                                                <td className="px-6 py-4">
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-md text-[10px] font-black uppercase">
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default CustomerDetailPage;