import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { useNavigation } from '@/hooks/use-navigation';
import {
    Search, Package, Plane, CheckCircle,
    Clock, ArrowRightLeft, Filter, AlertTriangle, MapPin, BadgeDollarSign
} from 'lucide-react';

// --- INTERFAZ BASADA EN TU EXCEL MAESTRO ---
interface PackageData {
    id: number;
    casillero: string; // Columna "CASILLERO" en CLIENTES.csv
    cliente: string;   // Columna "NOMBRE"
    tracking: string;  // Columna "TRACKING" en PAQUETES.csv
    detalle: string;   // Columna "DETALLE"
    peso: number;      // Columna "PESO"
    ubicacion: string; // Columna "UBICACION"
    estado: string;    // Columna "ESTADO"
    monto: string;     // Relacionado con FACTURACION.csv
    pagado: boolean;
}

const MOCK_PACKAGES: PackageData[] = [
    {
        id: 1,
        casillero: 'M-102',
        cliente: 'Sebastian Jimenez',
        tracking: '1Z999AA10293',
        detalle: 'Zapatos Nike',
        peso: 3.5,
        ubicacion: 'Bante A1',
        estado: 'En Bodega Miami',
        monto: '₡14,500',
        pagado: false
    },
    {
        id: 2,
        casillero: 'M-045',
        cliente: 'Adriana Castro',
        tracking: 'USP8822001',
        detalle: 'Repuestos Carro',
        peso: 12.0,
        ubicacion: 'Saco 22',
        estado: 'En Tránsito',
        monto: '₡35,000',
        pagado: true
    },
];

const LogisticsPage: React.FC = () => {
    const nav = useNavigation();
    const [search, setSearch] = useState('');

    const filteredPackages = useMemo(() => {
        return MOCK_PACKAGES.filter(p =>
            p.tracking.toLowerCase().includes(search.toLowerCase()) ||
            p.cliente.toLowerCase().includes(search.toLowerCase()) ||
            p.casillero.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    return (
        <>
            <Head><title>Logística Maestro | Magastore</title></Head>
            <DashboardLayout title="Control de Logística">

                <div className="flex flex-col gap-6">

                    {/* 1. INDICADORES BASADOS EN EL MAESTRO */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <StatCard icon={<Package size={20} className="text-blue-600" />} label="Paquetes en Miami" value="128" color="bg-blue-50" />
                        <StatCard icon={<Plane size={20} className="text-amber-600" />} label="En Tránsito (Vuelo)" value="42" color="bg-amber-50" />
                        <StatCard icon={<MapPin size={20} className="text-green-600" />} label="Listos en CR" value="15" color="bg-green-50" />
                        <StatCard icon={<BadgeDollarSign size={20} className="text-purple-600" />} label="Pendiente Cobro" value="₡1.2M" color="bg-purple-50" />
                    </div>

                    {/* 2. BARRA DE HERRAMIENTAS INTELIGENTE */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-[2rem] border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-3 flex-1">
                            <div className="relative flex-1 max-w-md group">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-600 transition-colors" size={18} />
                                <input
                                    type="text"
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-neutral-50 rounded-2xl text-sm outline-none border-2 border-transparent focus:border-blue-100 focus:bg-white transition-all"
                                    placeholder="Buscar por M-XXX, Tracking o Nombre..."
                                />
                            </div>
                            <button className="hidden md:flex items-center gap-2 px-4 py-3 text-neutral-500 font-bold text-xs bg-neutral-50 rounded-2xl hover:bg-neutral-100 transition-colors uppercase tracking-widest">
                                <Filter size={14} /> Filtros Avanzados
                            </button>
                        </div>

                        <div className="flex items-center gap-3">
                            <Button
                                variant={ButtonVariant.CANCEL}
                                text="Exportar Maestro"
                                className="h-12 px-6 text-[10px] font-black uppercase tracking-widest border-2"
                            />
                            <Button
                                variant={ButtonVariant.PRIMARY}
                                text="+ Registrar Paquete"
                                className="h-12 px-8 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-200"
                                onClick={() => nav.admin.logistics.registerPackage()}
                            />
                        </div>
                    </div>

                    {/* 3. TABLA CON ESTRUCTURA DEL EXCEL */}
                    <div className="bg-white rounded-[2.5rem] border border-neutral-100 overflow-hidden shadow-xl shadow-neutral-100/50">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-neutral-50/80 border-b border-neutral-100">
                                        <th className="px-6 py-5 text-center w-12"><input type="checkbox" className="rounded-md border-neutral-300" /></th>
                                        <th className="px-6 py-5"><Typography variant={TypographyVariant.OVERLINE}>Casillero / Cliente</Typography></th>
                                        <th className="px-6 py-5"><Typography variant={TypographyVariant.OVERLINE}>Info Paquete</Typography></th>
                                        <th className="px-6 py-5 text-center"><Typography variant={TypographyVariant.OVERLINE}>Peso & Ubicación</Typography></th>
                                        <th className="px-6 py-5"><Typography variant={TypographyVariant.OVERLINE}>Liquidación</Typography></th>
                                        <th className="px-6 py-5"><Typography variant={TypographyVariant.OVERLINE}>Estado</Typography></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-50">
                                    {filteredPackages.map((pkg) => (
                                        <tr
                                            key={pkg.id}
                                            className="hover:bg-blue-50/40 transition-all group cursor-pointer"
                                            onClick={() => nav.admin.logistics.packageDetail(pkg.id)}
                                        >
                                            <td className="px-6 py-4 text-center" onClick={(e) => e.stopPropagation()}>
                                                <input type="checkbox" className="rounded-md border-neutral-300" />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded-lg mb-1 italic">
                                                        {pkg.casillero}
                                                    </span>
                                                    <span className="font-bold text-neutral-800 text-sm">{pkg.cliente}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-mono text-[11px] font-bold text-neutral-500 uppercase tracking-tighter">
                                                        {pkg.tracking}
                                                    </span>
                                                    <span className="text-[11px] text-neutral-400 font-medium truncate max-w-[150px]">
                                                        {pkg.detalle}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-sm font-black text-neutral-800">{pkg.peso} lbs</span>
                                                    <span className="flex items-center gap-1 text-[9px] font-bold text-neutral-400 uppercase">
                                                        <MapPin size={10} /> {pkg.ubicacion}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-neutral-900">{pkg.monto}</span>
                                                    <span className={`text-[9px] font-black uppercase ${pkg.pagado ? 'text-green-500' : 'text-red-400'}`}>
                                                        {pkg.pagado ? '● Pagado' : '○ Pendiente'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={pkg.estado} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

// --- COMPONENTES AUXILIARES ---

const StatCard = ({ icon, label, value, color }: { icon: React.ReactNode, label: string, value: string, color: string }) => (
    <div className={`${color} p-6 rounded-[2rem] border-2 border-white shadow-sm hover:shadow-md transition-shadow`}>
        <div className="bg-white p-3 rounded-2xl w-fit shadow-sm mb-4">{icon}</div>
        <p className="text-[10px] font-black uppercase text-neutral-400 tracking-[0.15em] mb-1">{label}</p>
        <p className="text-2xl font-black text-neutral-800">{value}</p>
    </div>
);

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
        'En Bodega Miami': 'bg-blue-100 text-blue-700 border-blue-200',
        'En Tránsito': 'bg-amber-100 text-amber-700 border-amber-200',
        'Listo para Entrega': 'bg-green-100 text-green-700 border-green-200',
        'default': 'bg-neutral-100 text-neutral-600 border-neutral-200'
    };

    return (
        <span className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider border ${styles[status] || styles.default}`}>
            {status}
        </span>
    );
};

export default LogisticsPage;