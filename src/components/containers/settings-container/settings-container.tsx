import React, { useState } from 'react';
import { Save, Calculator, History, Loader2, ArrowRight, ShieldCheck, Info, Truck } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useSettings } from './use-settings';
import { SettingsHistory } from '@/types/settings/settings.types';

export const SettingsContainer: React.FC = () => {
    const {
        settings,
        history,
        priceInCRC,
        profitMargin,
        handleUpdateSetting,
        handleSave,
        isLoading,
        isSaving
    } = useSettings();

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 5;

    const historyColumns: Column<SettingsHistory>[] = [
        {
            header: 'Fecha',
            accessor: 'changed_at',
            render: (row) => (
                <span className="text-xs text-slate-500 font-medium">
                    {new Date(row.changed_at).toLocaleDateString('es-CR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                    })}
                </span>
            ),
        },
        {
            header: 'Parámetro',
            accessor: 'parameter_name',
            render: (row) => (
                <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                    {row.parameter_name}
                </span>
            ),
        },
        {
            header: 'Cambio',
            accessor: 'old_value',
            render: (row) => (
                <div className="flex items-center gap-2 font-mono text-[11px]">
                    <span className="text-slate-400 line-through">{Number(row.old_value).toLocaleString()}</span>
                    <ArrowRight size={10} className="text-slate-300" />
                    <span className="text-amber-600 font-bold">{Number(row.new_value).toLocaleString()}</span>
                </div>
            ),
        },
        {
            header: 'Usuario',
            accessor: 'changed_by_name',
            render: (row) => (
                <span className="text-sm text-slate-600 font-medium">{row.changed_by_name}</span>
            ),
        },
    ];

    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.max(1, Math.ceil(history.length / itemsPerPage));

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-amber-600 mb-2" />
            <Typography variant={TypographyVariant.BODY_BOLD}>Sincronizando sistema...</Typography>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 items-start animate-in fade-in duration-500">
            {/* ÁREA PRINCIPAL */}
            <div className="flex-1 space-y-6 w-full">
                {/* Formulario Compacto */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                                <ShieldCheck size={18} />
                            </div>
                            <Typography variant={TypographyVariant.BODY_BOLD}>Tarifario Base</Typography>
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-black hover:bg-slate-800 transition-all shadow-lg active:scale-95 disabled:opacity-50"
                        >
                            {isSaving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                            {isSaving ? 'GUARDANDO...' : 'GUARDAR CAMBIOS'}
                        </button>
                    </div>

                    {/* Tarifas internacionales */}
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Flete internacional</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        {[
                            { label: 'Precio / Lb',    key: 'price_per_lb',  icon: '$',  hint: 'USD por libra cobrado al cliente' },
                            { label: 'Tipo de Cambio', key: 'exchange_rate',  icon: '₡',  hint: 'Colones por dólar' },
                            { label: 'Ganancia / Lb',  key: 'profit_per_lb', icon: '$',  hint: 'USD de margen por libra (solo reporting)' },
                            { label: 'Peso Mínimo',    key: 'min_weight',    icon: 'Lb', hint: 'Libras mínimas a cobrar' },
                        ].map((input) => (
                            <div key={input.key} className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1" title={input.hint}>
                                    {input.label}
                                </label>
                                <div className="relative group">
                                    <input
                                        type="number"
                                        value={settings[input.key as keyof typeof settings]}
                                        onChange={(e) => handleUpdateSetting(input.key as any, Number(e.target.value))}
                                        className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 outline-none transition-all"
                                    />
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-amber-500">{input.icon}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Tarifas de entrega local */}
                    <div className="border-t border-slate-100 pt-5">
                        <div className="flex items-center gap-2 mb-3">
                            <Truck size={14} className="text-slate-400" />
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Entrega local en Costa Rica</p>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                                { label: 'Correos de Costa Rica', key: 'correos_fee_crc', icon: '₡', hint: 'Tarifa fija de envío por Correos CR' },
                                { label: 'Tracopa / Encomienda',  key: 'tracopa_fee_crc', icon: '₡', hint: 'Tarifa fija de envío por Tracopa' },
                            ].map((input) => (
                                <div key={input.key} className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1" title={input.hint}>
                                        {input.label}
                                    </label>
                                    <div className="relative group">
                                        <input
                                            type="number"
                                            value={settings[input.key as keyof typeof settings]}
                                            onChange={(e) => handleUpdateSetting(input.key as any, Number(e.target.value))}
                                            className="w-full pl-3 pr-8 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm font-bold focus:bg-white focus:ring-4 focus:ring-amber-500/5 focus:border-amber-500 outline-none transition-all"
                                        />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 group-focus-within:text-amber-500">{input.icon}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Tabla de Auditoría */}
                <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center gap-2">
                        <History size={15} className="text-slate-400" />
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-600">Registro de Modificaciones</Typography>
                    </div>
                    <NewTable
                        data={paginatedHistory}
                        columns={historyColumns}
                        isLoading={false}
                        totalRows={history.length}
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        itemsPerPage={itemsPerPage}
                    />
                </div>
            </div>

            {/* BARRA LATERAL */}
            <div className="w-full lg:w-72 space-y-4 flex-shrink-0">
                {/* Vista Previa Light */}
                <div className="bg-gradient-to-br from-amber-50 to-indigo-50 rounded-2xl p-5 border border-amber-100 shadow-sm relative overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                        <Calculator size={14} className="text-amber-600" />
                        <Typography variant={TypographyVariant.OVERLINE} className="font-black text-amber-900/40 tracking-widest">Simulación</Typography>
                    </div>

                    <div className="space-y-4 relative z-10">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold text-amber-900/40 uppercase mb-1">Cobro x Libra</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-amber-900 leading-none italic">₡{priceInCRC.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-amber-400 uppercase font-mono">crc</span>
                            </div>
                        </div>

                        <div className="flex flex-col pt-3 border-t border-amber-200/50">
                            <span className="text-[10px] font-bold text-emerald-900/40 uppercase mb-1">Ganancia estimada / lb</span>
                            <div className="flex items-center justify-between">
                                <span className="text-xl font-black text-emerald-600">
                                    ₡{Math.round(settings.profit_per_lb * settings.exchange_rate).toLocaleString()}
                                </span>
                                <div className="px-2 py-0.5 bg-emerald-500/10 rounded text-[11px] font-black text-emerald-600 border border-emerald-500/10">
                                    {profitMargin}%
                                </div>
                            </div>
                        </div>

                        <div className="pt-3 border-t border-amber-200/50 space-y-1.5">
                            <span className="text-[10px] font-bold text-amber-900/40 uppercase block">Envío local</span>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-amber-900/50">Correos CR</span>
                                <span className="font-black text-amber-900">₡{Number(settings.correos_fee_crc).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-[11px]">
                                <span className="text-amber-900/50">Tracopa</span>
                                <span className="font-black text-amber-900">₡{Number(settings.tracopa_fee_crc).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Aviso Importante */}
                <div className="bg-amber-50 border border-amber-100 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                        <Info size={16} className="text-amber-600" />
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-amber-900 text-[11px] uppercase tracking-wider">Atención</Typography>
                    </div>
                    <Typography variant={TypographyVariant.BODY} className="text-amber-800 leading-relaxed text-[11px] font-medium">
                        La actualización de tarifas es global e inmediata para nuevos ingresos.
                    </Typography>
                </div>
            </div>
        </div>
    );
};