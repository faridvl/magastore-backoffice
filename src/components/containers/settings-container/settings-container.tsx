import React, { useState } from 'react';
import { Save, Calculator, History, Loader2, ArrowRight, ShieldCheck, Info, Truck, Package, Plus, Pencil, Check, X, Power, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { routesPrivate } from '@/shared/navigation/routes';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useSettings } from './use-settings';
import { useDeliveryRates, DeliveryRateDraft } from './use-delivery-rates';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { SettingsHistory } from '@/types/settings/settings.types';
import { DeliveryRate, DeliveryZone } from '@/types/logistics/logistics.types';

const ZONE_OPTIONS: { value: DeliveryZone | ''; label: string }[] = [
    { value: '', label: 'Sin zona' },
    { value: 'GAM', label: 'GAM' },
    { value: 'RESTO', label: 'Resto' },
];

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

    const {
        rates,
        isLoading: isLoadingRates,
        editingUuid,
        editDraft,
        startEdit,
        cancelEdit,
        updateEditDraft,
        saveEdit,
        isUpdating,
        showNewRow,
        newDraft,
        openNewRow,
        cancelNewRow,
        updateNewDraft,
        saveNewRow,
        isCreating,
        handleToggleActive,
        isToggling,
        confirmingDeleteUuid,
        requestDelete,
        cancelDelete,
        confirmDelete,
        isDeleting,
    } = useDeliveryRates();
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
    // Solo métodos que cobran entrega tienen tarifas por rango — retiro no aplica.
    const deliveryMethodOptions = (deliveryMethodsData?.data ?? [])
        .filter((m) => m.is_active && !m.is_pickup)
        .map((m) => ({ value: m.code, label: m.name }));

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

                {/* Card 2 — Costo courier: se administra por courier, no acá */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-blue-50 rounded-xl">
                            <Package size={15} className="text-blue-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Costo courier — Panamá</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Cada courier tiene su propia tarifa y su casillero</p>
                        </div>
                    </div>
                    <div className="px-5 py-4">
                        <p className="text-[12px] text-slate-500 leading-relaxed">
                            La tarifa por libra y el seguro se configuran por courier, junto con la dirección del
                            casillero y el prefijo de código de sus clientes.
                        </p>
                        <Link
                            href={routesPrivate.admin.courierRates}
                            className="inline-flex items-center gap-1.5 mt-3 px-3 py-2 bg-blue-50 text-blue-700 rounded-xl text-[11px] font-bold hover:bg-blue-100 transition-all"
                        >
                            <Truck size={13} /> Ir a Couriers y Casilleros
                        </Link>
                    </div>
                </div>

                {/* Card 3 — Entrega local: conversión kg/lb */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 rounded-xl">
                            <Truck size={15} className="text-emerald-500" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-slate-800">Entrega local — Costa Rica</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">Correos CR cobra por kg; el sistema pesa en libras</p>
                        </div>
                    </div>
                    <div className="px-5 py-4 flex flex-col sm:flex-row sm:flex-wrap gap-4">
                        <SettingInput
                            label="Kg por libra"
                            hint="Factor de conversión: 1 lb = X kg"
                            unit="kg/lb"
                            step="0.000001"
                            value={Number(settings.kg_per_lb)}
                            accentClass="focus-within:border-emerald-400 focus-within:ring-emerald-400/20"
                            onChange={(v) => handleUpdateSetting('kg_per_lb', v)}
                        />
                    </div>
                </div>

                {/* Card 4 — Tarifas por rango de peso (delivery_rates) */}
                <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-emerald-50 rounded-xl">
                                <Truck size={15} className="text-emerald-500" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-800">Tarifas por rango de peso</p>
                                <p className="text-[11px] text-slate-400 mt-0.5">Cobro al cliente y costo real por método, zona y rango (kg)</p>
                            </div>
                        </div>
                        <button
                            onClick={openNewRow}
                            disabled={showNewRow}
                            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold hover:bg-emerald-100 transition-all disabled:opacity-40"
                        >
                            <Plus size={13} /> Agregar
                        </button>
                    </div>

                    {/* Mobile: cards apiladas */}
                    <div className="sm:hidden divide-y divide-slate-50">
                        {showNewRow && (
                            <DeliveryRateCardForm
                                draft={newDraft}
                                onChange={updateNewDraft}
                                onSave={saveNewRow}
                                onCancel={cancelNewRow}
                                isSaving={isCreating}
                                deliveryMethodOptions={deliveryMethodOptions}
                            />
                        )}
                        {isLoadingRates ? (
                            <p className="px-5 py-6 text-center text-slate-400 text-xs">Cargando...</p>
                        ) : rates.length === 0 && !showNewRow ? (
                            <p className="px-5 py-6 text-center text-slate-400 text-xs">Sin tarifas configuradas. Usa &quot;Agregar&quot; para crear la primera.</p>
                        ) : rates.map((rate) => (
                            editingUuid === rate.uuid ? (
                                <DeliveryRateCardForm
                                    key={rate.uuid}
                                    draft={editDraft}
                                    onChange={updateEditDraft}
                                    onSave={saveEdit}
                                    onCancel={cancelEdit}
                                    isSaving={isUpdating}
                                    deliveryMethodOptions={deliveryMethodOptions}
                                />
                            ) : (
                                <div key={rate.uuid} className={`px-5 py-3.5 ${!rate.is_active ? 'opacity-40' : ''}`}>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-xs font-bold text-slate-700">
                                                {deliveryMethodOptions.find((o) => o.value === rate.delivery_method)?.label ?? rate.delivery_method}
                                                <span className="ml-1.5 font-medium text-slate-400">{rate.zone ?? 'Sin zona'}</span>
                                            </p>
                                            <p className="text-[11px] text-slate-500 font-mono mt-0.5">{Number(rate.min_weight_kg)}–{Number(rate.max_weight_kg)} kg</p>
                                        </div>
                                        <div className="text-right flex-shrink-0">
                                            <p className="text-xs font-bold text-slate-800">₡{Number(rate.fee_crc).toLocaleString()}</p>
                                            <p className="text-[11px] text-slate-500">
                                                {rate.cost_crc == null ? <span className="italic text-amber-600">Por confirmar</span> : `Costo ₡${Number(rate.cost_crc).toLocaleString()}`}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 mt-2">
                                        <RateActions
                                            rate={rate}
                                            isToggling={isToggling}
                                            isDeleting={isDeleting}
                                            confirming={confirmingDeleteUuid === rate.uuid}
                                            onToggle={() => handleToggleActive(rate)}
                                            onEdit={() => startEdit(rate)}
                                            onDelete={() => requestDelete(rate)}
                                            onConfirmDelete={confirmDelete}
                                            onCancelDelete={cancelDelete}
                                        />
                                    </div>
                                </div>
                            )
                        ))}
                    </div>

                    {/* Desktop: tabla */}
                    <div className="hidden sm:block overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="border-b border-slate-100">
                                    <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Método</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Zona</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Rango (kg)</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Cobro cliente</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Costo real</th>
                                    <th className="px-4 py-2.5 text-[9px] font-black text-slate-400 uppercase tracking-wider">Activo</th>
                                    <th className="px-4 py-2.5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {showNewRow && (
                                    <DeliveryRateRow
                                        draft={newDraft}
                                        onChange={updateNewDraft}
                                        onSave={saveNewRow}
                                        onCancel={cancelNewRow}
                                        isSaving={isCreating}
                                        deliveryMethodOptions={deliveryMethodOptions}
                                    />
                                )}
                                {isLoadingRates ? (
                                    <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs">Cargando...</td></tr>
                                ) : rates.length === 0 && !showNewRow ? (
                                    <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400 text-xs">Sin tarifas configuradas. Usa &quot;Agregar&quot; para crear la primera.</td></tr>
                                ) : rates.map((rate) => (
                                    editingUuid === rate.uuid ? (
                                        <DeliveryRateRow
                                            key={rate.uuid}
                                            draft={editDraft}
                                            onChange={updateEditDraft}
                                            onSave={saveEdit}
                                            onCancel={cancelEdit}
                                            isSaving={isUpdating}
                                            deliveryMethodOptions={deliveryMethodOptions}
                                        />
                                    ) : (
                                        <tr key={rate.uuid} className={!rate.is_active ? 'opacity-40' : ''}>
                                            <td className="px-4 py-2.5 text-xs font-bold text-slate-700">
                                                {deliveryMethodOptions.find((o) => o.value === rate.delivery_method)?.label ?? rate.delivery_method}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{rate.zone ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500 font-mono">{Number(rate.min_weight_kg)}–{Number(rate.max_weight_kg)} kg</td>
                                            <td className="px-4 py-2.5 text-xs font-bold text-slate-800">₡{Number(rate.fee_crc).toLocaleString()}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">
                                                {rate.cost_crc == null ? <span className="italic text-amber-600">Por confirmar</span> : `₡${Number(rate.cost_crc).toLocaleString()}`}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <button
                                                    onClick={() => handleToggleActive(rate)}
                                                    disabled={isToggling}
                                                    title={rate.is_active ? 'Desactivar' : 'Activar'}
                                                    className={`p-2.5 rounded-lg transition-colors ${rate.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                                >
                                                    <Power size={15} />
                                                </button>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center justify-end gap-1">
                                                    {confirmingDeleteUuid === rate.uuid ? (
                                                        <RateDeleteConfirm
                                                            isDeleting={isDeleting}
                                                            onConfirm={confirmDelete}
                                                            onCancel={cancelDelete}
                                                        />
                                                    ) : (
                                                        <>
                                                            <button
                                                                onClick={() => startEdit(rate)}
                                                                className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                                                title="Editar"
                                                            >
                                                                <Pencil size={15} />
                                                            </button>
                                                            <button
                                                                onClick={() => requestDelete(rate)}
                                                                className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                                                                title="Eliminar"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                ))}
                            </tbody>
                        </table>
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
                                <span className="text-[12px] text-slate-600">Tarifas activas</span>
                                <span className="text-[12px] font-bold text-slate-800">{rates.filter((r) => r.is_active).length}</span>
                            </div>
                            <p className="text-[10px] text-slate-400">Varía por método, zona y rango de peso — ver tabla de tarifas.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Confirmación de borrado en dos pasos, compartida entre tabla y cards.
function RateDeleteConfirm({
    isDeleting,
    onConfirm,
    onCancel,
}: {
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    return (
        <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider">¿Eliminar?</span>
            <button
                onClick={onConfirm}
                disabled={isDeleting}
                className="px-2.5 py-1.5 rounded-lg bg-red-500 text-white text-[11px] font-bold hover:bg-red-600 transition-colors disabled:opacity-40"
            >
                Sí
            </button>
            <button
                onClick={onCancel}
                disabled={isDeleting}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-500 text-[11px] font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
            >
                No
            </button>
        </div>
    );
}

// Botonera de acciones de una tarifa en la vista mobile (cards).
function RateActions({
    rate,
    isToggling,
    isDeleting,
    confirming,
    onToggle,
    onEdit,
    onDelete,
    onConfirmDelete,
    onCancelDelete,
}: {
    rate: DeliveryRate;
    isToggling: boolean;
    isDeleting: boolean;
    confirming: boolean;
    onToggle: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onConfirmDelete: () => void;
    onCancelDelete: () => void;
}) {
    if (confirming) {
        return <RateDeleteConfirm isDeleting={isDeleting} onConfirm={onConfirmDelete} onCancel={onCancelDelete} />;
    }
    return (
        <>
            <button
                onClick={onToggle}
                disabled={isToggling}
                title={rate.is_active ? 'Desactivar' : 'Activar'}
                className={`p-2.5 rounded-lg transition-colors ${rate.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
            >
                <Power size={15} />
            </button>
            <button
                onClick={onEdit}
                className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                title="Editar"
            >
                <Pencil size={15} />
            </button>
            <button
                onClick={onDelete}
                className="p-2.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                title="Eliminar"
            >
                <Trash2 size={15} />
            </button>
        </>
    );
}

// Formulario apilado para crear/editar una tarifa en mobile — mismos campos que
// DeliveryRateRow pero en layout vertical para que sea usable en pantallas chicas.
function DeliveryRateCardForm({
    draft,
    onChange,
    onSave,
    onCancel,
    isSaving,
    deliveryMethodOptions,
}: {
    draft: DeliveryRateDraft;
    onChange: (field: keyof DeliveryRateDraft, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    deliveryMethodOptions: { value: string; label: string }[];
}) {
    const inputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400';
    const labelClass = 'text-[10px] font-semibold text-slate-500 uppercase tracking-wider';

    return (
        <div className="px-5 py-4 bg-emerald-50/30 space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Método</label>
                    <select value={draft.delivery_method} onChange={(e) => onChange('delivery_method', e.target.value)} className={inputClass}>
                        <option value="" disabled>Selecciona un método</option>
                        {deliveryMethodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Zona</label>
                    <select value={draft.zone ?? ''} onChange={(e) => onChange('zone', e.target.value)} className={inputClass}>
                        {ZONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Peso mín (kg)</label>
                    <input type="number" step="0.01" min="0" inputMode="decimal" value={draft.min_weight_kg} onChange={(e) => onChange('min_weight_kg', e.target.value)} placeholder="0" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Peso máx (kg)</label>
                    <input type="number" step="0.01" min="0" inputMode="decimal" value={draft.max_weight_kg} onChange={(e) => onChange('max_weight_kg', e.target.value)} placeholder="0" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Cobro cliente (₡)</label>
                    <input type="number" step="1" min="0" inputMode="numeric" value={draft.fee_crc} onChange={(e) => onChange('fee_crc', e.target.value)} placeholder="CRC" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Costo real (₡)</label>
                    <input type="number" step="1" min="0" inputMode="numeric" value={draft.cost_crc} onChange={(e) => onChange('cost_crc', e.target.value)} placeholder="Por confirmar" className={inputClass} />
                </div>
            </div>
            <div className="flex gap-2">
                <button
                    onClick={onSave}
                    disabled={isSaving || !draft.delivery_method}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40"
                >
                    <Check size={14} /> Guardar
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 border border-slate-200 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                    <X size={14} /> Cancelar
                </button>
            </div>
        </div>
    );
}

// Fila editable inline — usada tanto para editar una tarifa existente como para
// dar de alta una nueva. El solapamiento de rango se valida en el backend al guardar.
function DeliveryRateRow({
    draft,
    onChange,
    onSave,
    onCancel,
    isSaving,
    deliveryMethodOptions,
}: {
    draft: DeliveryRateDraft;
    onChange: (field: keyof DeliveryRateDraft, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
    deliveryMethodOptions: { value: string; label: string }[];
}) {
    const cellInputClass = 'w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400';

    return (
        <tr className="bg-emerald-50/30">
            <td className="px-4 py-2">
                <select
                    value={draft.delivery_method}
                    onChange={(e) => onChange('delivery_method', e.target.value)}
                    className={cellInputClass}
                >
                    <option value="" disabled>Selecciona</option>
                    {deliveryMethodOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </td>
            <td className="px-4 py-2">
                <select
                    value={draft.zone ?? ''}
                    onChange={(e) => onChange('zone', e.target.value)}
                    className={cellInputClass}
                >
                    {ZONE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
            </td>
            <td className="px-4 py-2">
                <div className="flex items-center gap-1">
                    <input type="number" step="0.01" min="0" value={draft.min_weight_kg} onChange={(e) => onChange('min_weight_kg', e.target.value)} placeholder="Min" className={`${cellInputClass} w-16`} />
                    <span className="text-slate-300 text-xs">–</span>
                    <input type="number" step="0.01" min="0" value={draft.max_weight_kg} onChange={(e) => onChange('max_weight_kg', e.target.value)} placeholder="Max" className={`${cellInputClass} w-16`} />
                </div>
            </td>
            <td className="px-4 py-2">
                <input type="number" step="1" min="0" value={draft.fee_crc} onChange={(e) => onChange('fee_crc', e.target.value)} placeholder="CRC" className={`${cellInputClass} w-24`} />
            </td>
            <td className="px-4 py-2">
                <input type="number" step="1" min="0" value={draft.cost_crc} onChange={(e) => onChange('cost_crc', e.target.value)} placeholder="Por confirmar" className={`${cellInputClass} w-28`} />
            </td>
            <td className="px-4 py-2"></td>
            <td className="px-4 py-2">
                <div className="flex items-center justify-end gap-1.5">
                    <button
                        onClick={onSave}
                        disabled={isSaving || !draft.delivery_method}
                        title="Guardar"
                        className="p-2.5 rounded-lg text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-40"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        onClick={onCancel}
                        disabled={isSaving}
                        title="Cancelar"
                        className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors disabled:opacity-40"
                    >
                        <X size={16} />
                    </button>
                </div>
            </td>
        </tr>
    );
}
