import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import {
    Save, ChevronLeft, Truck, AlertCircle,
    ClipboardList, MapPin, Calendar, User
} from 'lucide-react';

const EditPackagePage: React.FC = () => {
    const router = useRouter();
    const { id } = router.query;

    // Estado inicial del paquete (vendría de la DB)
    const [pkg, setPkg] = useState({
        tracking: '1ZF4W4400346171903',
        cliente: 'Sebastian Jimenez',
        casillero: 'C-26',
        estadoActual: 'TRANSITO',
        peso: 3.0,
        ubicacionActual: 'Miami Hub'
    });

    // Estado para el nuevo movimiento
    const [nuevoMovimiento, setNuevoMovimiento] = useState({
        nuevoEstado: 'TRANSITO',
        ubicacion: '',
        comentario: ''
    });

    const handleUpdate = (e: React.FormEvent) => {
        e.preventDefault();
        // 1. Aquí harías el UPDATE en la tabla 'paquetes'
        // 2. Y el INSERT en la tabla 'bitacora_estados'
        console.log("Actualizando paquete y guardando bitácora...", { pkg, nuevoMovimiento });
        router.push(`/admin/logistics/detail/${id}`);
    };

    return (
        <>
            <Head><title>Editar Paquete | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Actualizar Logística">

                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-2 text-neutral-400 hover:text-blue-600 font-black text-[10px] uppercase tracking-widest mb-8 transition-all"
                >
                    <ChevronLeft size={16} /> Cancelar y Volver
                </button>

                <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMNA PRINCIPAL: Formulario de Cambio */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-10 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-10 border-b border-neutral-50 pb-6">
                                <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-100">
                                    <Truck size={24} />
                                </div>
                                <div>
                                    <Typography variant={TypographyVariant.BODY_BOLD}>Actualizar Estado del Paquete</Typography>
                                    <p className="text-xs text-neutral-400 font-medium">Registra el siguiente paso en la cadena logística</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.1em] ml-1">Nuevo Estado</label>
                                    <select
                                        required
                                        value={nuevoMovimiento.nuevoEstado}
                                        onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, nuevoEstado: e.target.value })}
                                        className="w-full p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-black text-xs text-blue-700 uppercase tracking-widest transition-all outline-none"
                                    >
                                        <option value="MIAMI">En Bodega Miami</option>
                                        <option value="TRANSITO">En Tránsito a CR</option>
                                        <option value="ADUANA">En Trámites de Aduana</option>
                                        <option value="LISTO">Listo para Entrega</option>
                                        <option value="ENTREGADO">Entregado con Éxito</option>
                                    </select>
                                </div>

                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.1em] ml-1">Ubicación Física (Opcional)</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Ej: Bodega Central, San José"
                                            value={nuevoMovimiento.ubicacion}
                                            onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, ubicacion: e.target.value })}
                                            className="w-full pl-12 pr-4 py-4 bg-neutral-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl font-bold text-sm transition-all outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3 mb-10">
                                <label className="text-[10px] font-black text-neutral-500 uppercase tracking-[0.1em] ml-1 flex justify-between">
                                    Comentario de la Bitácora
                                    <span className="text-blue-500 tracking-normal normal-case">Obligatorio</span>
                                </label>
                                <textarea
                                    required
                                    placeholder="Explica el motivo del cambio o detalles de la ubicación actual..."
                                    className="w-full p-6 bg-neutral-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-[2rem] text-sm font-medium text-neutral-600 h-40 transition-all outline-none"
                                    value={nuevoMovimiento.comentario}
                                    onChange={(e) => setNuevoMovimiento({ ...nuevoMovimiento, comentario: e.target.value })}
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full py-5 bg-neutral-900 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-neutral-100 flex items-center justify-center gap-3"
                            >
                                <Save size={18} /> Actualizar y Notificar Movimiento
                            </button>
                        </div>
                    </div>

                    {/* COLUMNA LATERAL: Resumen del Paquete */}
                    <div className="space-y-6">
                        <div className="bg-neutral-50 p-8 rounded-[2.5rem] border border-neutral-100">
                            <div className="flex items-center gap-2 mb-6 opacity-50">
                                <ClipboardList size={16} />
                                <span className="text-[10px] font-black uppercase tracking-widest">Resumen de Paquete</span>
                            </div>

                            <div className="space-y-4">
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Tracking Number</span>
                                    <span className="font-mono text-sm font-black text-neutral-800">{pkg.tracking}</span>
                                </div>
                                <div className="flex flex-col gap-1">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Cliente / Casillero</span>
                                    <span className="text-sm font-black text-neutral-800">{pkg.cliente} ({pkg.casillero})</span>
                                </div>
                                <div className="flex flex-col gap-1 pt-4 border-t border-neutral-200">
                                    <span className="text-[9px] font-bold text-neutral-400 uppercase">Estado Actual</span>
                                    <span className="text-xs font-black text-blue-600 uppercase tracking-widest">{pkg.estadoActual}</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex gap-4">
                            <AlertCircle className="text-amber-600 shrink-0" size={20} />
                            <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                                Este cambio será visible inmediatamente para el cliente en su panel de control.
                            </p>
                        </div>
                    </div>
                </form>
            </DashboardLayout>
        </>
    );
};

// export const getServerSideProps = authorizeServerSidePage();
export default EditPackagePage;