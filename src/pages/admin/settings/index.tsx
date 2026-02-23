import React, { useState } from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { Save, Calculator, History, ArrowRight, TrendingUp } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const SettingsPage: React.FC = () => {
    // Estados principales de configuración
    const [settings, setSettings] = useState({
        pricePerLb: 6,
        exchangeRate: 520,
        profitPerLb: 2000,
        minWeight: 1,
    });

    // Datos simulados de historial (En el futuro vendrán de la tabla historial_parametros)
    const [history] = useState([
        { id: 1, date: '2026-02-22', param: 'Tipo de Cambio', old: 515, new: 520, user: 'Admin' },
        { id: 2, date: '2026-02-20', param: 'Precio Libra', old: 5.5, new: 6, user: 'Admin' },
        { id: 3, date: '2026-02-15', param: 'Ganancia Base', old: 1800, new: 2000, user: 'Admin' },
    ]);

    const handleSave = () => {
        // Aquí conectarás con tu API de Supabase/Backend
        alert('Configuración guardada. Se ha registrado un evento en el historial.');
    };

    return (
        <>
            <Head><title>Configuración | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Configuración del Sistema">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* COLUMNA IZQUIERDA: Formulario */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                            <div className="flex items-center gap-3 mb-8">
                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                    <TrendingUp size={20} />
                                </div>
                                <Typography variant={TypographyVariant.BODY_BOLD}>
                                    Parámetros de Facturación Actuales
                                </Typography>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Precio por Libra (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={settings.pricePerLb}
                                            onChange={(e) => setSettings({ ...settings, pricePerLb: Number(e.target.value) })}
                                            className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Tipo de Cambio (CRC)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₡</span>
                                        <input
                                            type="number"
                                            value={settings.exchangeRate}
                                            onChange={(e) => setSettings({ ...settings, exchangeRate: Number(e.target.value) })}
                                            className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Ganancia Base x Libra (CRC)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">₡</span>
                                        <input
                                            type="number"
                                            value={settings.profitPerLb}
                                            onChange={(e) => setSettings({ ...settings, profitPerLb: Number(e.target.value) })}
                                            className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Peso Mínimo Cobrable (Lb)</label>
                                    <input
                                        type="number"
                                        value={settings.minWeight}
                                        onChange={(e) => setSettings({ ...settings, minWeight: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold transition-all"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="mt-10 flex items-center justify-center gap-2 w-full md:w-auto px-10 py-4 bg-blue-600 text-white rounded-2xl font-black hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 active:scale-95"
                            >
                                <Save size={18} />
                                Actualizar Configuración
                            </button>
                        </div>

                        {/* TABLA DE HISTORIAL */}
                        <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
                            <div className="p-6 border-b border-neutral-50 flex items-center gap-2">
                                <History size={18} className="text-neutral-400" />
                                <Typography variant={TypographyVariant.BODY_BOLD}>Historial de Cambios</Typography>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-neutral-50 text-[10px] uppercase text-neutral-400 font-black">
                                        <tr>
                                            <th className="px-6 py-4">Fecha</th>
                                            <th className="px-6 py-4">Parámetro</th>
                                            <th className="px-6 py-4 text-center">Cambio Realizado</th>
                                            <th className="px-6 py-4">Usuario</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-neutral-50">
                                        {history.map((item) => (
                                            <tr key={item.id} className="hover:bg-neutral-50/50 transition-colors">
                                                <td className="px-6 py-4 text-sm text-neutral-500 font-medium">{item.date}</td>
                                                <td className="px-6 py-4 text-sm font-bold text-neutral-700">{item.param}</td>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <span className="text-xs text-red-400 font-bold line-through">{item.old}</span>
                                                        <ArrowRight size={14} className="text-neutral-300" />
                                                        <span className="text-sm text-green-600 font-black">{item.new}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-xs font-bold text-neutral-400">{item.user}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    {/* COLUMNA DERECHA: Widget Informativo */}
                    <div className="space-y-6">
                        <div className="bg-neutral-900 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                            {/* Decoración de fondo */}
                            <div className="absolute -right-4 -top-4 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl" />

                            <div className="flex items-center gap-3 mb-8 relative">
                                <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-900/20">
                                    <Calculator size={20} />
                                </div>
                                <Typography variant={TypographyVariant.BODY_BOLD}>Simulador de Cobro</Typography>
                            </div>

                            <div className="space-y-5 relative">
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-400 text-sm">Precio venta (1lb)</span>
                                    <span className="font-bold text-lg">₡{(settings.pricePerLb * settings.exchangeRate).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-400 text-sm">Ganancia estimada</span>
                                    <span className="font-bold text-green-400">₡{settings.profitPerLb.toLocaleString()}</span>
                                </div>

                                <div className="pt-6 border-t border-neutral-800">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <span className="block text-[10px] uppercase font-black text-neutral-500 tracking-wider">Margen de utilidad</span>
                                            <span className="text-3xl font-black text-blue-400">
                                                {((settings.profitPerLb / (settings.pricePerLb * settings.exchangeRate)) * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-8 rounded-[2rem] border border-blue-100">
                            <Typography variant={TypographyVariant.BODY} className="text-blue-900 leading-relaxed text-sm">
                                <strong>Importante:</strong> Al guardar, los nuevos valores se aplicarán únicamente a los paquetes registrados a partir de este momento.
                                <br /><br />
                                Los paquetes en tránsito o entregados conservarán el costo con el que fueron facturados originalmente para no afectar los saldos de los clientes.
                            </Typography>
                        </div>
                    </div>

                </div>
            </DashboardLayout>
        </>
    );
};

export const getServerSideProps = authorizeServerSidePage();

export default SettingsPage;