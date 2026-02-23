import React, { useState } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import {
    Search, Truck, Package, User, DollarSign,
    AlertCircle, CheckCircle2, MapPin, Calendar, ExternalLink
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const AdminTrackingPage: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('1ZF4W4400346171903');
    const [isSearching, setIsSearching] = useState(false);
    const [result, setResult] = useState<any>(null);

    // Simulación de búsqueda en tu base de datos (Excel)
    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSearching(true);

        // Simulamos delay de búsqueda
        setTimeout(() => {
            // Ejemplo de data encontrada (Basada en tus archivos CLIENTES y PAQUETES)
            setResult({
                tracking: searchQuery || '1ZF4W4400346171903',
                status: 'EN BODEGA PTY',
                lastUpdate: '2025-05-21 14:30',
                cliente: {
                    nombre: 'Sebastian Jimenez',
                    codigo: 'C-26',
                    whatsapp: '+506 8888-8888'
                },
                detalles: {
                    peso: '4.5 Lbs',
                    tipo: 'Aéreo',
                    consolidado: 'CON-9942',
                    costoInterno: '₡12,400', // Lo que te cuesta a ti
                    precioCliente: '₡24,500'  // Lo que debe pagar el cliente
                },
                estadoPago: 'PENDIENTE',
                notas: 'Cliente solicita entrega en oficina el viernes.'
            });
            setIsSearching(false);
        }, 800);
    };

    return (
        <>
            <Head><title>Rastreo Avanzado | Admin Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Buscador Logístico">

                <div className="max-w-4xl mx-auto space-y-8">

                    {/* Buscador Principal */}
                    <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] shadow-xl border border-neutral-100 dark:border-neutral-800">
                        <div className="mb-6 text-center">
                            <Typography variant={TypographyVariant.SUBTITLE}>Rastreo de Operaciones</Typography>
                            <Typography variant={TypographyVariant.HELPER}>
                                Ingresa el Tracking ID o Código de Paquete para ver info financiera y logística detallada.
                            </Typography>
                        </div>

                        <form onSubmit={handleSearch} className="relative group">
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pegar número de tracking aquí..."
                                className="w-full p-6 pl-14 bg-neutral-50 dark:bg-neutral-800 border-2 border-transparent focus:border-blue-500 rounded-3xl outline-none transition-all font-mono text-lg"
                            />
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-blue-500" size={24} />
                            <button
                                type="submit"
                                className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg"
                            >
                                {isSearching ? 'Buscando...' : 'Rastrear'}
                            </button>
                        </form>
                    </div>

                    {/* Resultados del Rastreo (Solo si hay resultado) */}
                    {result && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">

                            {/* Header del Resultado */}
                            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-blue-600 p-8 rounded-[2.5rem] text-white shadow-xl shadow-blue-100">
                                <div className="flex items-center gap-5">
                                    <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-md">
                                        <Truck size={32} />
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-blue-100 tracking-[0.2em] mb-1">Estado Actual</p>
                                        <h2 className="text-2xl font-black">{result.status}</h2>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs font-bold text-blue-200 uppercase mb-1">Último movimiento</p>
                                    <p className="font-mono text-sm">{result.lastUpdate}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                                {/* CARD: Información del Cliente */}
                                <div className="bg-white dark:bg-neutral-900 p-8 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-50 pb-4">
                                        <User className="text-blue-600" size={20} />
                                        <Typography variant={TypographyVariant.BODY_BOLD}>Cliente / Dueño</Typography>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Nombre completo</p>
                                            <p className="text-lg font-bold text-neutral-800">{result.cliente.nombre}</p>
                                        </div>
                                        <div className="flex justify-between">
                                            <div>
                                                <p className="text-[10px] font-black text-neutral-400 uppercase">Casillero</p>
                                                <p className="font-black text-blue-600">{result.cliente.codigo}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-neutral-400 uppercase">WhatsApp</p>
                                                <p className="font-bold">{result.cliente.whatsapp}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* CARD: Detalles de Facturación Interna */}
                                <div className="bg-neutral-900 p-8 rounded-[2.5rem] text-white shadow-xl">
                                    <div className="flex items-center gap-3 mb-6 border-b border-neutral-800 pb-4">
                                        <DollarSign className="text-green-400" size={20} />
                                        <Typography variant={TypographyVariant.BODY_BOLD}>Liquidación Admin</Typography>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-neutral-400">Total a Cobrar:</span>
                                            <span className="text-xl font-black text-white">{result.detalles.precioCliente}</span>
                                        </div>
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-neutral-400">Estado de Pago:</span>
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black ${result.estadoPago === 'PAGADO' ? 'bg-green-500/20 text-green-400' : 'bg-orange-500/20 text-orange-400'
                                                }`}>
                                                {result.estadoPago}
                                            </span>
                                        </div>
                                        <div className="pt-4 border-t border-neutral-800 flex justify-between">
                                            <span className="text-xs text-neutral-500 italic">Notas: {result.notas}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Detalle Técnico Inferior */}
                            <div className="bg-white dark:bg-neutral-900 p-6 rounded-[2rem] border border-neutral-100 flex flex-wrap gap-8 justify-around">
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-neutral-400 uppercase">Peso Real</p>
                                    <p className="font-bold">{result.detalles.peso}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-neutral-400 uppercase">Consolidado</p>
                                    <p className="font-bold">{result.detalles.consolidado}</p>
                                </div>
                                <div className="text-center">
                                    <p className="text-[10px] font-black text-neutral-400 uppercase">Tipo</p>
                                    <p className="font-bold">{result.detalles.tipo}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </DashboardLayout>
        </>
    );
};

export default AdminTrackingPage;