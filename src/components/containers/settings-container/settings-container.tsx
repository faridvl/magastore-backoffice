import React, { useState } from 'react';
import { Save, Calculator, History, Loader2, ArrowRight, ShieldCheck, Info, Truck, Package } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useSettings } from './use-settings';
import { SettingsHistory } from '@/types/settings/settings.types';

// Input con sufijo de unidad integrado
function SettingInput({
    label,
    hint,
    unit,
    value,
    step,
    accentClass,
    onChange,
}: {
    label: string;
    hint: string;
    unit: string;
    value: number;
    step?: string;
    accentClass: string;
    onChange: (v: number) => void;
}) {
    return (
        <div className="flex flex-col gap-1.5 w-full sm:w-auto">
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider" title={hint}>
                {label}
            </label>
            <div className={`flex items-stretch border border-slate-200 rounded-lg overflow-hidden bg-slate-50 transition-all focus-within:bg-white focus-within:ring-2 ${accentClass}`}>
                <input
                    type="number"
                    step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-transparent text-sm font-semibold text-slate-800 outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="px-2.5 flex items-center bg-slate-100 border-l border-slate-200 text-[10px] font-bold text-slate-400 select-none">
                    {unit}
                </span>
            </div>
        </div>
    );
}

export const SettingsContainer: React.FC = () => {
    const {
        settings,
        history,
        priceInCRC,
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
                <span className="text-[11px] text-slate-500 font-medium tabular-nums">
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
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-wider">
                    {row.parameter_name.replace(/_/g, ' ')}
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
                    <span className="text-emerald-600 font-bold">{Number(row.new_value).toLocaleString()}</span>
                </div>
            ),
        },
        {
            header: 'Usuario',
            accessor: 'changed_by_name',
            render: (row) => (
                <span className="text-[12px] text-slate-700 font-medium">{row.changed_by_name}</span>
            ),
        },
    ];

    const paginatedHistory = history.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    const totalPages = Math.max(1, Math.ceil(history.length / itemsPerPage));

    const formatDate = (d: string) => new Date(d).toLocaleDateString('es-CR', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });

    if (isLoading) return (
        <div className="flex flex-col items-center justify-center min-h-[400px]">
            <Loader2 className="animate-spin text-amber-600 mb-2" />
            <Typography variant={TypographyVariant.BODY_BOLD}>Sincronizando sistema...</Typography>
        </div>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-5 items-start animate-in fade-in duration-500 pb-8">
            {/* Botón guardar + aviso — siempre primero en mobile */}
            <div className="w-full order-1 lg:hidden">
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2">
                        <Info size={13} className="text-amber-500 flex-shrink-0" />
                        <p className="text-[11px] text-slate-500">Los cambios aplican de forma inmediata a nuevos registros.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-bold tracking-wide hover:bg-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                        {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>
            </div>

            {/* ÁREA PRINCIPAL */}
            <div className="flex-1 space-y-4 w-full min-w-0 order-3 lg:order-1">

                {/* Botón guardar + aviso — solo desktop */}
                <div className="hidden lg:flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Info size={13} className="text-amber-500 flex-shrink-0" />
                        <p className="text-[11px] text-slate-500">Los cambios aplican de forma inmediata a nuevos registros.</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-[11px] font-bold tracking-wide hover:bg-slate-700 transition-all shadow-sm active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? <Loader2 className="animate-spin" size={13} /> : <Save size={13} />}
                        {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                </div>

                {/* Card 1 — Cobro al cliente */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-amber-50 rounded-xl">
                            <ShieldCheck size={15} className="text-amber-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Cobro al cliente</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Tarifa y tipo de cambio aplicados en cada factura</p>
                        </div>
                    </div>
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:flex-wrap gap-4">
                        <SettingInput
                            label="Precio / Lb"
                            hint="USD por libra cobrado al cliente"
                            unit="USD"
                            value={Number(settings.price_per_lb)}
                            accentClass="focus-within:border-amber-400 focus-within:ring-amber-400/20"
                            onChange={(v) => handleUpdateSetting('price_per_lb', v)}
                        />
                        <SettingInput
                            label="Tipo de cambio"
                            hint="Colones por dólar"
                            unit="CRC"
                            value={Number(settings.exchange_rate)}
                            accentClass="focus-within:border-amber-400 focus-within:ring-amber-400/20"
                            onChange={(v) => handleUpdateSetting('exchange_rate', v)}
                        />
                        <SettingInput
                            label="Peso mínimo"
                            hint="Libras mínimas a cobrar"
                            unit="Lb"
                            value={Number(settings.min_weight)}
                            accentClass="focus-within:border-amber-400 focus-within:ring-amber-400/20"
                            onChange={(v) => handleUpdateSetting('min_weight', v)}
                        />
                    </div>
                </div>

                {/* Card 2 — Costo courier */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Package size={15} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Costo courier — Panamá</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Lo que cobra el courier por mover la mercancía hasta CR</p>
                        </div>
                    </div>
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:flex-wrap gap-4">
                        <SettingInput
                            label="Tarifa / Lb"
                            hint="USD por libra que cobra el courier"
                            unit="USD"
                            step="0.01"
                            value={Number(settings.courier_rate_usd)}
                            accentClass="focus-within:border-blue-400 focus-within:ring-blue-400/20"
                            onChange={(v) => handleUpdateSetting('courier_rate_usd', v)}
                        />
                        <SettingInput
                            label="Seguro"
                            hint="USD fijo de seguro (aplica ≥2 lb)"
                            unit="USD"
                            step="0.01"
                            value={Number(settings.courier_insurance_usd)}
                            accentClass="focus-within:border-blue-400 focus-within:ring-blue-400/20"
                            onChange={(v) => handleUpdateSetting('courier_insurance_usd', v)}
                        />
                    </div>
                </div>

                {/* Card 3 — Entrega local */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <Truck size={15} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Entrega local — Costa Rica</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Tarifa fija por método de envío. Se guarda como snapshot en cada factura</p>
                        </div>
                    </div>
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:flex-wrap gap-4">
                        <SettingInput
                            label="Correos de Costa Rica"
                            hint="Tarifa fija por envío vía Correos CR"
                            unit="CRC"
                            value={Number(settings.correos_fee_crc)}
                            accentClass="focus-within:border-emerald-400 focus-within:ring-emerald-400/20"
                            onChange={(v) => handleUpdateSetting('correos_fee_crc', v)}
                        />
                        <SettingInput
                            label="Tracopa / Encomienda"
                            hint="Tarifa fija por envío vía Tracopa"
                            unit="CRC"
                            value={Number(settings.tracopa_fee_crc)}
                            accentClass="focus-within:border-emerald-400 focus-within:ring-emerald-400/20"
                            onChange={(v) => handleUpdateSetting('tracopa_fee_crc', v)}
                        />
                    </div>
                </div>

                {/* Tabla de Auditoría */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2.5">
                        <div className="p-1.5 bg-slate-100 rounded-lg">
                            <History size={13} className="text-slate-500" />
                        </div>
                        <div>
                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-700">Registro de modificaciones</Typography>
                            <p className="text-[10px] text-slate-400 mt-0.5">{history.length} cambio{history.length !== 1 ? 's' : ''} registrado{history.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Mobile: cards */}
                    <div className="sm:hidden divide-y divide-slate-100">
                        {paginatedHistory.length === 0 ? (
                            <p className="text-center text-[12px] text-slate-400 py-8">Sin registros</p>
                        ) : paginatedHistory.map((row, i) => (
                            <div key={i} className="px-5 py-3.5 flex items-center justify-between gap-3">
                                <div className="flex flex-col gap-1 min-w-0">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-wider w-fit">
                                        {row.parameter_name.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 tabular-nums">{formatDate(row.changed_at)}</span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono text-[11px] flex-shrink-0">
                                    <span className="text-slate-400 line-through">{Number(row.old_value).toLocaleString()}</span>
                                    <ArrowRight size={9} className="text-slate-300" />
                                    <span className="text-emerald-600 font-bold">{Number(row.new_value).toLocaleString()}</span>
                                </div>
                            </div>
                        ))}
                        {/* Paginación mobile */}
                        <div className="px-5 py-3 flex items-center justify-between border-t border-slate-100">
                            <span className="text-[10px] text-slate-400 uppercase tracking-wider">Página {currentPage} de {totalPages}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg border border-slate-200 text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                                >
                                    Anterior
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1.5 text-[11px] font-semibold rounded-lg bg-slate-900 text-white disabled:opacity-30 hover:bg-slate-700 transition-colors"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Desktop: tabla */}
                    <div className="hidden sm:block">
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
            </div>

            {/* SIDEBAR */}
            <div className="w-full lg:w-64 space-y-4 flex-shrink-0 order-2 lg:order-2">
                {/* Simulación */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-2">
                        <Calculator size={14} className="text-amber-500" />
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Simulación</span>
                    </div>
                    <div className="p-5 space-y-4">
                        <div>
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Cobro x libra</p>
                            <div className="flex items-baseline gap-1.5">
                                <span className="text-2xl font-black text-slate-800 leading-none">₡{priceInCRC.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-slate-400">CRC</span>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1">
                                ${Number(settings.price_per_lb).toFixed(2)} × ₡{Number(settings.exchange_rate).toLocaleString()}
                            </p>
                        </div>
                        <div className="border-t border-slate-100 pt-4 space-y-2">
                            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Envío local</p>
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-slate-600">Correos CR</span>
                                <span className="text-[12px] font-bold text-slate-800">₡{Number(settings.correos_fee_crc).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[12px] text-slate-600">Tracopa</span>
                                <span className="text-[12px] font-bold text-slate-800">₡{Number(settings.tracopa_fee_crc).toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
