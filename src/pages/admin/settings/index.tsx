import React, { useState } from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { Save, DollarSign, Calculator, Percent } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const SettingsPage: React.FC = () => {
    // Estados basados en tus archivos de Excel
    const [settings, setSettings] = useState({
        pricePerLb: 6,
        exchangeRate: 520,
        profitPerLb: 2000, // Ganancia promedio por libra en CRC
        minWeight: 1,
    });

    const handleSave = () => {
        // Aquí iría la lógica para guardar en BD
        alert('Configuración actualizada correctamente');
    };

    return (
        <>
            <Head><title>Configuración | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Configuración del Sistema">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Formulario de Parámetros */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
                            <Typography variant={TypographyVariant.BODY_BOLD} className="mb-6 block text-neutral-800">
                                Parámetros de Facturación
                            </Typography>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Precio por Libra (USD)</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-bold">$</span>
                                        <input
                                            type="number"
                                            value={settings.pricePerLb}
                                            onChange={(e) => setSettings({ ...settings, pricePerLb: Number(e.target.value) })}
                                            className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
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
                                            className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
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
                                            className="w-full pl-8 pr-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Peso Mínimo (Lb)</label>
                                    <input
                                        type="number"
                                        value={settings.minWeight}
                                        onChange={(e) => setSettings({ ...settings, minWeight: Number(e.target.value) })}
                                        className="w-full px-4 py-3 bg-neutral-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 font-bold"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSave}
                                className="mt-8 flex items-center justify-center gap-2 w-full md:w-auto px-8 py-3 bg-blue-600 text-white rounded-xl font-black hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                            >
                                <Save size={18} />
                                Guardar Cambios
                            </button>
                        </div>
                    </div>

                    {/* Resumen Informativo / Simulador */}
                    <div className="space-y-6">
                        <div className="bg-neutral-900 rounded-3xl p-6 text-white">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-blue-600 rounded-lg">
                                    <Calculator size={20} />
                                </div>
                                <Typography variant={TypographyVariant.BODY_BOLD}>Previsualización</Typography>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500">Cobro al cliente (1lb)</span>
                                    <span className="font-bold">₡{(settings.pricePerLb * settings.exchangeRate).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-neutral-500">Ganancia proyectada</span>
                                    <span className="font-bold text-green-400">₡{settings.profitPerLb.toLocaleString()}</span>
                                </div>
                                <div className="pt-4 border-t border-neutral-800 flex justify-between items-end">
                                    <span className="text-xs text-neutral-500">Margen aprox.</span>
                                    <span className="text-xl font-black text-blue-400">
                                        {((settings.profitPerLb / (settings.pricePerLb * settings.exchangeRate)) * 100).toFixed(1)}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-blue-50 p-6 rounded-3xl border border-blue-100">
                            <Typography variant={TypographyVariant.BODY} className="text-blue-800 leading-relaxed">
                                <strong>Nota:</strong> Estos valores se aplican automáticamente a los nuevos paquetes registrados. Los paquetes ya facturados mantendrán los valores históricos.
                            </Typography>
                        </div>
                    </div>

                </div>
            </DashboardLayout>
        </>
    );
};

// export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

export default SettingsPage;