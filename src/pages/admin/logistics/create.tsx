import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
// import { Typography, TypographyVariant } from '@/components/typography/typography';
import { Package, Calculator, Save, Info } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const CreatePackagePage: React.FC = () => {
    // Configuración traída de tus PARAMETROS.csv
    const PRECIO_LB_USD = 6;
    const TIPO_CAMBIO = 520;

    const [formData, setFormData] = useState({
        tracking: '',
        codigoCliente: '',
        pesoLb: 0,
        tipoPaquete: 'Normal', // Normal, Frágil, etc.
        costoPTY: 0, // Lo que te costó a ti el flete/aduana
        observaciones: ''
    });

    const [totals, setTotals] = useState({
        cobroClienteCRC: 0,
        gananciaEstimada: 0
    });

    // Cálculo automático cada vez que cambia el peso o el costo
    useEffect(() => {
        const cobroUSD = formData.pesoLb * PRECIO_LB_USD;
        const cobroCRC = cobroUSD * TIPO_CAMBIO;

        // Ganancia = Lo que cobras - lo que te costó traerlo (Costo_PTY)
        const ganancia = cobroCRC - formData.costoPTY;

        setTotals({
            cobroClienteCRC: cobroCRC,
            gananciaEstimada: ganancia
        });
    }, [formData.pesoLb, formData.costoPTY]);

    return (
        <>
            <Head><title>Nuevo Paquete | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Ingresar Nuevo Paquete">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Formulario Principal */}
                    <div className="lg:col-span-2 bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Package size={20} /></div>
                            <Typography variant={TypographyVariant.BODY_BOLD}>Información de la Carga</Typography>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1">
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Número de Tracking</label>
                                <input
                                    type="text"
                                    placeholder="Ej: 1Z999AA1..."
                                    className="w-full mt-1 p-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-mono"
                                    onChange={(e) => setFormData({ ...formData, tracking: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Código de Cliente</label>
                                <select
                                    className="w-full mt-1 p-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500"
                                    onChange={(e) => setFormData({ ...formData, codigoCliente: e.target.value })}
                                >
                                    <option value="">Seleccionar Cliente...</option>
                                    <option value="C-26">C-26 | Sebastian Jimenez</option>
                                    <option value="C-54">C-54 | Eduardo Guzman</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Peso (Libras)</label>
                                <input
                                    type="number"
                                    placeholder="0.00"
                                    className="w-full mt-1 p-3 bg-neutral-50 border-none rounded-xl"
                                    onChange={(e) => setFormData({ ...formData, pesoLb: Number(e.target.value) })}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Costo Flete/PTY (CRC)</label>
                                <input
                                    type="number"
                                    placeholder="¿Cuánto te costó traerlo?"
                                    className="w-full mt-1 p-3 bg-neutral-50 border-none rounded-xl"
                                    onChange={(e) => setFormData({ ...formData, costoPTY: Number(e.target.value) })}
                                />
                            </div>

                            <div className="col-span-2">
                                <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Observaciones</label>
                                <textarea
                                    rows={2}
                                    className="w-full mt-1 p-3 bg-neutral-50 border-none rounded-xl"
                                    placeholder="Detalles del paquete..."
                                    onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                                />
                            </div>
                        </div>

                        <button className="mt-8 flex items-center justify-center gap-2 w-full bg-neutral-900 text-white p-4 rounded-2xl font-black hover:bg-blue-600 transition-all shadow-lg">
                            <Save size={20} />
                            Registrar Paquete
                        </button>
                    </div>

                    {/* Panel Lateral de Cálculo */}
                    <div className="space-y-6">
                        <div className="bg-blue-600 rounded-3xl p-8 text-white shadow-xl shadow-blue-200 relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center gap-2 mb-6 opacity-80">
                                    <Calculator size={18} />
                                    <span className="text-xs font-black uppercase tracking-widest">Resumen de Cobro</span>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase opacity-60">Total a cobrar al cliente</p>
                                        <p className="text-3xl font-black">₡{totals.cobroClienteCRC.toLocaleString()}</p>
                                    </div>

                                    <div className="pt-4 border-t border-white/10">
                                        <p className="text-[10px] font-bold uppercase opacity-60">Tu Ganancia Neta</p>
                                        <p className="text-xl font-bold text-blue-200">₡{totals.gananciaEstimada.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                            {/* Decoración */}
                            <div className="absolute -right-6 -bottom-6 text-white/10 rotate-12">
                                <Package size={150} />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm flex gap-4">
                            <div className="text-blue-500"><Info size={20} /></div>
                            <p className="text-xs text-neutral-500 leading-relaxed">
                                El cálculo se basa en la tarifa de <strong>${PRECIO_LB_USD}</strong> por libra con un tipo de cambio de <strong>₡{TIPO_CAMBIO}</strong>.
                            </p>
                        </div>
                    </div>

                </div>
            </DashboardLayout>
        </>
    );
};

// export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });
export default CreatePackagePage;