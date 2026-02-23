import React from 'react';
import { Package, Calculator, Save, Info } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { usePackageCalculator } from './use-package-calculator';

export const CreatePackageContainer: React.FC = () => {
    const { formData, calculations, updateField, handleSave } = usePackageCalculator();

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Formulario Principal */}
            <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] border border-neutral-100 shadow-sm">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                        <Package size={24} />
                    </div>
                    <div>
                        <Typography variant={TypographyVariant.BODY_BOLD}>Información del Ingreso</Typography>
                        <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Mapeo con PAQUETES.csv</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 md:col-span-1">
                        <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Número de Tracking</label>
                        <input
                            type="text"
                            placeholder="Ej: 1Z999AA1..."
                            className="w-full mt-1 p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all font-mono text-sm"
                            value={formData.tracking}
                            onChange={(e) => updateField('tracking', e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Código de Cliente (Casillero)</label>
                        <select
                            className="w-full mt-1 p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm"
                            value={formData.codigoCliente}
                            onChange={(e) => updateField('codigoCliente', e.target.value)}
                        >
                            <option value="">Seleccionar Cliente...</option>
                            <option value="C-26">MG-102 | Sebastian Jimenez</option>
                            <option value="C-54">MG-045 | Adriana Castro</option>
                        </select>
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Peso (Libras Reales)</label>
                        <input
                            type="number"
                            placeholder="0.00"
                            className="w-full mt-1 p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm font-bold text-neutral-800"
                            onChange={(e) => updateField('pesoLb', Number(e.target.value))}
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Costo Operativo (CRC)</label>
                        <input
                            type="number"
                            placeholder="Costo flete/aduana..."
                            className="w-full mt-1 p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm"
                            onChange={(e) => updateField('costoPTY', Number(e.target.value))}
                        />
                    </div>

                    <div className="col-span-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 ml-1">Observaciones / Detalle</label>
                        <textarea
                            rows={3}
                            className="w-full mt-1 p-4 bg-neutral-50 border-2 border-transparent focus:border-blue-100 focus:bg-white rounded-2xl outline-none transition-all text-sm"
                            placeholder="¿Qué contiene el paquete?"
                            value={formData.observaciones}
                            onChange={(e) => updateField('observaciones', e.target.value)}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    className="mt-8 flex items-center justify-center gap-3 w-full bg-neutral-900 text-white p-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-blue-600 transition-all shadow-xl shadow-neutral-200"
                >
                    <Save size={18} />
                    Confirmar Registro
                </button>
            </div>

            {/* Panel de Totales */}
            <div className="space-y-6">
                <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-100 relative overflow-hidden">
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-8 opacity-70">
                            <Calculator size={18} />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Cálculo de Facturación</span>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Total a cobrar al cliente</p>
                                <p className="text-4xl font-black italic">
                                    ₡{calculations.cobroTotalCRC.toLocaleString('es-CR')}
                                </p>
                                <p className="text-[11px] font-bold mt-1 opacity-60">
                                    ≈ ${calculations.cobroTotalUSD.toFixed(2)} USD
                                </p>
                            </div>

                            <div className="pt-6 border-t border-white/10">
                                <p className="text-[10px] font-bold uppercase opacity-60 mb-1">Tu Ganancia Neta</p>
                                <p className="text-2xl font-bold text-blue-200">
                                    ₡{calculations.gananciaEstimada.toLocaleString('es-CR')}
                                </p>
                            </div>
                        </div>
                    </div>
                    {/* Elemento decorativo sutil */}
                    <div className="absolute -right-10 -bottom-10 text-white/10 rotate-12">
                        <Package size={180} />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-[2rem] border border-neutral-100 shadow-sm flex gap-4 items-start">
                    <div className="text-blue-500 mt-1"><Info size={20} /></div>
                    <div>
                        <p className="text-[11px] text-neutral-500 leading-relaxed font-medium">
                            Basado en <strong>${calculations.precioPorLibra}/lb</strong> <br />
                            Tipo de cambio: <strong>₡{calculations.tipoCambio}</strong>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};