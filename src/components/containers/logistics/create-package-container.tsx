import React from 'react';
import { Package, Search, ChevronDown, Check, Save, Calculator, Settings, Info, Loader2, MapPin } from 'lucide-react';
import { usePackageCalculator } from './use-package-calculator';

export const CreatePackageContainer: React.FC = () => {
    const {
        formData, setFormData, calculations, settings, courierRates, selectedCourierRate,
        customers, selectedCustomer, customerAddresses, searchTerm, setSearchTerm,
        isOpen, setIsOpen, handleSave, isSaving, isLoading
    } = usePackageCalculator();

    if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin mx-auto text-amber-500" /></div>;

    return (
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 p-4">

            {/* COLUMNA IZQUIERDA: FORMULARIO */}
            <div className="md:col-span-7 lg:col-span-8 bg-white rounded-[2rem] border border-slate-100 shadow-sm p-5 md:p-8">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-amber-600 text-white rounded-xl"><Package size={20} /></div>
                    <h2 className="text-lg font-bold text-slate-800">Nuevo Ingreso</h2>
                </div>

                <div className="space-y-6">
                    {/* CLIENTE */}
                    <div className="relative">
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Cliente</label>
                        <div
                            onClick={() => setIsOpen(!isOpen)}
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-all"
                        >
                            <span className={`text-sm ${selectedCustomer ? 'font-bold text-slate-900' : 'text-slate-400'}`}>
                                {selectedCustomer ? `${selectedCustomer.customer_code} | ${selectedCustomer.first_name} ${selectedCustomer.last_name}` : "Seleccionar cliente..."}
                            </span>
                            <ChevronDown size={16} className={isOpen ? 'rotate-180 transition-all' : ''} />
                        </div>

                        {isOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
                                <div className="p-3 bg-slate-50 border-b border-slate-100">
                                    <div className="relative">
                                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input
                                            autoFocus
                                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm outline-none"
                                            placeholder="Buscar cliente..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto">
                                    {customers.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => { setFormData({ ...formData, customer_id: c.id }); setIsOpen(false); }}
                                            className="p-4 hover:bg-amber-50 cursor-pointer flex justify-between items-center transition-colors"
                                        >
                                            <span className="text-sm font-medium">{c.customer_code} — {c.first_name} {c.last_name}</span>
                                            {formData.customer_id === c.id && <Check size={14} className="text-amber-600" />}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* DIRECCIÓN DE ENTREGA */}
                    {formData.customer_id && (
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Dirección de Entrega</label>
                            {customerAddresses.length === 0 ? (
                                <div className="flex items-center gap-2 p-4 bg-orange-50 rounded-2xl border border-orange-100 text-xs text-orange-700">
                                    <MapPin size={14} />
                                    <span>Este cliente no tiene direcciones registradas.</span>
                                </div>
                            ) : (
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-amber-200 transition-all"
                                    value={formData.address_id ?? ''}
                                    onChange={(e) => setFormData({ ...formData, address_id: e.target.value || null })}
                                >
                                    <option value="">Sin dirección específica</option>
                                    {customerAddresses.map((addr) => (
                                        <option key={addr.id} value={addr.id}>
                                            {addr.address_label} — {addr.province}, {addr.canton}{addr.is_default ? ' (Principal)' : ''}
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Tracking</label>
                            <input
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-mono uppercase focus:bg-white focus:border-amber-200 transition-all outline-none"
                                placeholder="0000000000"
                                value={formData.tracking_number}
                                onChange={(e) => setFormData({ ...formData, tracking_number: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Peso (Lbs)</label>
                            <input
                                type="number"
                                min="1"
                                step="1"
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                                value={formData.weight_lb || ''}
                                onKeyDown={(e) => ['.', ',', 'e', 'E', '+', '-'].includes(e.key) && e.preventDefault()}
                                onChange={(e) => setFormData({ ...formData, weight_lb: Math.max(1, Math.floor(Number(e.target.value))) })}
                            />
                        </div>
                    </div>

                    {/* TIENDA / PROVEEDOR */}
                    <div>
                        <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Tienda / Proveedor (opcional)</label>
                        <input
                            className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:bg-white focus:border-amber-200 transition-all outline-none"
                            placeholder="Ej: Amazon, Shein, Best Buy..."
                            value={formData.store_name}
                            onChange={(e) => setFormData({ ...formData, store_name: e.target.value })}
                        />
                    </div>

                    {/* COURIER RATE + TC BANCO */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">Tarifa Courier</label>
                            {courierRates.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-2xl text-xs text-slate-400 font-medium border border-slate-100">
                                    Sin tarifas configuradas
                                </div>
                            ) : (
                                <select
                                    className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:border-amber-200 transition-all"
                                    value={formData.courier_rate_id ?? ''}
                                    onChange={(e) => setFormData({ ...formData, courier_rate_id: e.target.value || null })}
                                >
                                    <option value="">Sin tarifa / manual</option>
                                    {courierRates.map((r) => (
                                        <option key={r.uuid} value={r.uuid}>
                                            {r.name} — ${Number(r.rate_usd).toFixed(2)}/lb
                                        </option>
                                    ))}
                                </select>
                            )}
                        </div>
                        <div>
                            <label className="text-[10px] font-bold uppercase text-slate-400 mb-1 block ml-1">TC Banco (₡ por $)</label>
                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Ej: 518.50"
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:bg-white outline-none"
                                value={formData.tc_banco || ''}
                                onChange={(e) => setFormData({ ...formData, tc_banco: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    {selectedCourierRate && (
                        <label className="flex items-center gap-3 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={formData.insurance_applied}
                                onChange={(e) => setFormData({ ...formData, insurance_applied: e.target.checked })}
                                className="w-4 h-4 accent-amber-500"
                            />
                            <span className="text-xs font-semibold text-slate-600">
                                Seguro courier cobrado
                                {selectedCourierRate.insurance_usd ? ` ($${Number(selectedCourierRate.insurance_usd).toFixed(2)})` : ''}
                            </span>
                        </label>
                    )}

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full bg-slate-900 text-white p-5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex justify-center items-center gap-2"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Guardar Paquete
                    </button>
                </div>
            </div>

            {/* COLUMNA DERECHA: CONFIG Y TOTALES */}
            <div className="md:col-span-5 lg:col-span-4 space-y-6">

                {/* CARD DE TOTALES */}
                <div className="bg-slate-900 p-5 md:p-8 rounded-[2rem] md:rounded-[2.5rem] text-white shadow-xl relative overflow-hidden">
                    <div className="absolute -right-6 -top-6 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl" />
                    <div className="absolute -left-4 -bottom-4 w-24 h-24 bg-amber-500/5 rounded-full blur-xl" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="p-1.5 bg-amber-500/20 rounded-lg">
                                <Calculator size={14} className="text-amber-400" />
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Cálculo en vivo</span>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 mb-1">Cobro al Cliente</p>
                                <h3 className="text-2xl md:text-4xl font-black italic text-white">₡{calculations.cobroTotalCRC.toLocaleString()}</h3>
                            </div>
                            {calculations.courierCostCRC > 0 && (
                                <div className="pt-4 border-t border-white/5 space-y-2">
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Costo Courier</p>
                                        <p className="text-sm font-bold text-slate-300">
                                            ${calculations.courierCostUSD.toFixed(2)} · ₡{Math.round(calculations.courierCostCRC).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <p className="text-[10px] uppercase font-bold text-slate-500">Ganancia Est.</p>
                                        <p className={`text-sm font-bold ${calculations.ganancia >= 0 ? 'text-amber-400' : 'text-red-400'}`}>
                                            ₡{Math.round(calculations.ganancia).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* CARD DE CONFIGURACIÓN DEL SISTEMA */}
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4 text-slate-800">
                        <Settings size={16} />
                        <span className="text-xs font-bold uppercase tracking-wider">Configuración Actual</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-4">
                        <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Precio/Lb</p>
                            <p className="text-sm font-black text-slate-700">${settings?.price_per_lb}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Tipo Cambio</p>
                            <p className="text-sm font-black text-slate-700">₡{settings?.exchange_rate}</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Mínimo</p>
                            <p className="text-sm font-black text-slate-700">{settings?.min_weight} Lbs</p>
                        </div>
                        <div>
                            <p className="text-[9px] text-slate-400 font-bold uppercase">Última Act.</p>
                            <p className="text-[10px] font-medium text-slate-500">{new Date(settings?.updated_at || '').toLocaleDateString()}</p>
                        </div>
                    </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-2xl border border-orange-100">
                    <Info size={16} className="text-orange-500 mt-1" />
                    <p className="text-[10px] text-orange-700 leading-snug font-medium">
                        Si el peso es menor a <strong>{settings?.min_weight}lb</strong>, el sistema cobrará automáticamente el peso mínimo configurado.
                    </p>
                </div>
            </div>
        </div>
    );
};
