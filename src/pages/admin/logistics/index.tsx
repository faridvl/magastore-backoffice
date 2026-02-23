import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { useNavigation } from '@/hooks/use-navigation';
import { Search, Filter, ChevronRight } from 'lucide-react';

// MOCK: Paquetes en tránsito/llegada
const MOCK_PACKAGES = [
    { id: 1, tracking: '1Z999AA1', client: 'Juan Pérez', weight: 5.2, status: 'En Bodega Miami', date: '2026-02-20' },
    { id: 2, tracking: 'USP8822', client: 'María López', weight: 1.5, status: 'En Tránsito', date: '2026-02-21' },
    { id: 3, tracking: 'AMZ-4411', client: 'Carlos Ruiz', weight: 10.0, status: 'Listo para Entrega', date: '2026-02-18' },
];

const LogisticsPage: React.FC = () => {
    const nav = useNavigation();

    return (
        <>
            <Head><title>Logística | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Control de Paquetes">

                {/* Header de Acciones Rápidas */}
                <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                    <div className="relative w-full md:w-96">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por tracking o cliente..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                        />
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <Button
                            variant={ButtonVariant.CANCEL}
                            text="Filtrar"
                        // icon={<Filter size={16} />} // Descomentar si tu componente Button soporta iconos
                        />
                        <Button
                            variant={ButtonVariant.PRIMARY}
                            text="+ Nuevo Paquete"
                            onClick={() => nav.admin.logistics.registerPackage()}
                        />
                    </div>
                </div>

                <div className="bg-white rounded-[2rem] shadow-sm border border-neutral-100 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-neutral-50 text-neutral-400 text-[10px] uppercase font-black tracking-widest">
                                <tr>
                                    <th className="px-6 py-5">Tracking</th>
                                    <th className="px-6 py-5">Cliente</th>
                                    <th className="px-6 py-5">Peso</th>
                                    <th className="px-6 py-5">Estado</th>
                                    <th className="px-6 py-5 text-right">Detalle</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-50">
                                {MOCK_PACKAGES.map((pkg) => (
                                    <tr
                                        key={pkg.id}
                                        onClick={() => nav.admin.logistics.packageDetail(pkg.id)} // Navegación al detalle
                                        className="hover:bg-blue-50/50 transition-all cursor-pointer group"
                                    >
                                        <td className="px-6 py-4 font-mono text-sm font-bold text-neutral-800 group-hover:text-blue-600">
                                            {pkg.tracking}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-bold text-neutral-700">{pkg.client}</div>
                                            <div className="text-[10px] text-neutral-400 font-medium">Recibido: {pkg.date}</div>
                                        </td>
                                        <td className="px-6 py-4 font-black text-neutral-900 text-sm">
                                            {pkg.weight} lb
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${pkg.status === 'Listo para Entrega'
                                                ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'
                                                }`}>
                                                {pkg.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-neutral-50 text-neutral-400 group-hover:bg-blue-600 group-hover:text-white transition-all">
                                                <ChevronRight size={16} />
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default LogisticsPage;