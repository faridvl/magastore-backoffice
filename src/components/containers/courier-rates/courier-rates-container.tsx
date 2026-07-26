import React from 'react';
import { Truck, Plus, Pencil, Check, X, Power, MapPin, Hash, Star } from 'lucide-react';
import { useCourierRates, CourierRateDraft } from './use-courier-rates';
import { PackageType } from '@/types/logistics/logistics.types';
import { CourierRateFormErrors } from '@/shared/utils/courier-rate-schema';

const PACKAGE_TYPE_OPTIONS: { value: PackageType; label: string }[] = [
    { value: PackageType.AEREO, label: 'Aéreo' },
    { value: PackageType.MARITIMO, label: 'Marítimo' },
];

export const CourierRatesContainer: React.FC = () => {
    const {
        rates,
        isLoading,
        editingUuid,
        editDraft,
        editErrors,
        startEdit,
        cancelEdit,
        updateEditDraft,
        saveEdit,
        isUpdating,
        showNewRow,
        newDraft,
        newErrors,
        openNewRow,
        cancelNewRow,
        updateNewDraft,
        saveNewRow,
        isCreating,
        handleToggleActive,
        isToggling,
        handleSetDefault,
        isSettingDefault,
    } = useCourierRates();

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-xl">
                        <Truck size={15} className="text-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Couriers y Casilleros</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Cada courier tiene su tarifa (costo real por libra) y su casillero: la dirección donde reciben los clientes y el prefijo con el que se genera su código
                        </p>
                    </div>
                </div>
                <button
                    onClick={openNewRow}
                    disabled={showNewRow}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 rounded-xl text-[11px] font-bold hover:bg-emerald-100 transition-all disabled:opacity-40"
                >
                    <Plus size={13} /> Agregar courier
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {showNewRow && (
                    <CourierRateForm
                        draft={newDraft}
                        errors={newErrors}
                        onChange={updateNewDraft}
                        onSave={saveNewRow}
                        onCancel={cancelNewRow}
                        isSaving={isCreating}
                    />
                )}

                {isLoading ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">Cargando...</p>
                ) : rates.length === 0 && !showNewRow ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">
                        Sin couriers configurados. Usa &quot;Agregar courier&quot; para crear el primero.
                    </p>
                ) : rates.map((rate) => (
                    editingUuid === rate.uuid ? (
                        <CourierRateForm
                            key={rate.uuid}
                            draft={editDraft}
                            errors={editErrors}
                            onChange={updateEditDraft}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div key={rate.uuid} className={`px-5 py-4 ${!rate.is_active ? 'opacity-40' : ''}`}>
                            <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-sm font-bold text-slate-800 truncate">{rate.name}</p>
                                        {rate.is_default && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                                <Star size={9} className="fill-emerald-600 text-emerald-600" /> Predeterminado
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        {rate.origin} · {PACKAGE_TYPE_OPTIONS.find((o) => o.value === rate.package_type)?.label ?? rate.package_type}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    {!rate.is_default && rate.is_active && (
                                        <button
                                            onClick={() => handleSetDefault(rate)}
                                            disabled={isSettingDefault}
                                            title="Marcar como predeterminado"
                                            className="p-2.5 rounded-lg text-slate-300 hover:bg-emerald-50 hover:text-emerald-600 transition-colors disabled:opacity-40"
                                        >
                                            <Star size={15} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleToggleActive(rate)}
                                        disabled={isToggling}
                                        title={rate.is_active ? 'Desactivar' : 'Activar'}
                                        className={`p-2.5 rounded-lg transition-colors ${rate.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                    >
                                        <Power size={15} />
                                    </button>
                                    <button
                                        onClick={() => startEdit(rate)}
                                        className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                        title="Editar"
                                    >
                                        <Pencil size={15} />
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <div className="px-3 py-2.5 bg-slate-50 rounded-xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tarifa</p>
                                    <p className="text-xs font-bold text-slate-800 mt-0.5">
                                        ${Number(rate.rate_usd).toFixed(2)}/lb
                                        <span className="font-medium text-slate-400"> · seguro ${Number(rate.insurance_usd).toFixed(2)}</span>
                                    </p>
                                </div>
                                <div className="px-3 py-2.5 bg-slate-50 rounded-xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <Hash size={9} /> Código
                                    </p>
                                    <p className="text-xs font-bold text-slate-800 mt-0.5 font-mono">
                                        {rate.code_prefix
                                            ? <>{rate.code_prefix}<span className="text-slate-400">{String(rate.current_counter ?? 0).padStart(2, '0')}</span></>
                                            : <span className="font-sans font-medium italic text-amber-600">Sin casillero</span>}
                                    </p>
                                </div>
                                <div className="px-3 py-2.5 bg-slate-50 rounded-xl">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                                        <MapPin size={9} /> Casillero
                                    </p>
                                    <p className="text-xs font-medium text-slate-600 mt-0.5 truncate" title={[rate.address_line, rate.city, rate.state, rate.postal_code].filter(Boolean).join(', ')}>
                                        {rate.address_line
                                            ? [rate.address_line, rate.city, rate.state].filter(Boolean).join(', ')
                                            : <span className="italic text-amber-600">Sin dirección</span>}
                                    </p>
                                </div>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

const inputClass = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400';
const inputErrorClass = 'w-full bg-white border border-red-300 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-red-400/30 focus:border-red-400';
const labelClass = 'text-[10px] font-semibold text-slate-500 uppercase tracking-wider';

function Field({
    label,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className={labelClass}>{label}</label>
            {children}
            {error && <p className="text-[10px] font-medium text-red-500 mt-0.5">{error}</p>}
        </div>
    );
}

function CourierRateForm({
    draft,
    errors,
    onChange,
    onSave,
    onCancel,
    isSaving,
}: {
    draft: CourierRateDraft;
    errors: CourierRateFormErrors;
    onChange: (field: keyof CourierRateDraft, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const cls = (field: keyof CourierRateDraft) => (errors[field] ? inputErrorClass : inputClass);

    return (
        <div className="px-5 py-5 bg-emerald-50/30 space-y-5">
            <div className="space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Courier y tarifa</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Nombre" error={errors.name}>
                        <input type="text" value={draft.name} onChange={(e) => onChange('name', e.target.value)} placeholder="EJ. AÉREO USA" className={cls('name')} />
                    </Field>
                    <Field label="Origen" error={errors.origin}>
                        <input type="text" value={draft.origin} onChange={(e) => onChange('origin', e.target.value)} placeholder="USA" className={cls('origin')} />
                    </Field>
                    <Field label="Tipo" error={errors.package_type}>
                        <select value={draft.package_type} onChange={(e) => onChange('package_type', e.target.value)} className={cls('package_type')}>
                            {PACKAGE_TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                    </Field>
                    {/* type="text" y no "number": la máscara de monto controla el
                        formato, y un input numérico rechaza el valor intermedio
                        mientras se escribe el decimal. */}
                    <Field label="Tarifa (USD/lb)" error={errors.rate_usd}>
                        <input type="text" inputMode="decimal" value={draft.rate_usd} onChange={(e) => onChange('rate_usd', e.target.value)} placeholder="0.00" className={cls('rate_usd')} />
                    </Field>
                    <Field label="Seguro (USD)" error={errors.insurance_usd}>
                        <input type="text" inputMode="decimal" value={draft.insurance_usd} onChange={(e) => onChange('insurance_usd', e.target.value)} placeholder="0.00" className={cls('insurance_usd')} />
                    </Field>
                </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-emerald-100">
                <div>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Casillero de esta ruta</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                        Dirección que se le comparte al cliente para recibir su mercancía, y prefijo con el que se genera su código
                    </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Field label="Prefijo de código" error={errors.code_prefix}>
                        <input type="text" value={draft.code_prefix} onChange={(e) => onChange('code_prefix', e.target.value)} placeholder="MGA-2453-C-" className={`${cls('code_prefix')} font-mono`} />
                    </Field>
                    <Field label="Teléfono de contacto" error={errors.contact_phone}>
                        <input type="text" inputMode="tel" value={draft.contact_phone} onChange={(e) => onChange('contact_phone', e.target.value)} placeholder="+1 786-360-2816" className={cls('contact_phone')} />
                    </Field>
                    <Field label="Dirección" error={errors.address_line}>
                        <input type="text" value={draft.address_line} onChange={(e) => onChange('address_line', e.target.value)} placeholder="2610 NW 89TH CT" className={cls('address_line')} />
                    </Field>
                    <Field label="Ciudad" error={errors.city}>
                        <input type="text" value={draft.city} onChange={(e) => onChange('city', e.target.value)} placeholder="DORAL" className={cls('city')} />
                    </Field>
                    <Field label="Estado / Provincia" error={errors.state}>
                        <input type="text" value={draft.state} onChange={(e) => onChange('state', e.target.value)} placeholder="FLORIDA" className={cls('state')} />
                    </Field>
                    <Field label="Código postal" error={errors.postal_code}>
                        <input type="text" inputMode="numeric" value={draft.postal_code} onChange={(e) => onChange('postal_code', e.target.value)} placeholder="33172-1615" className={cls('postal_code')} />
                    </Field>
                </div>
            </div>

            <div className="flex gap-2 pt-1">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition-colors disabled:opacity-40"
                >
                    <Check size={14} /> Guardar
                </button>
                <button
                    onClick={onCancel}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 border border-slate-200 bg-white text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-40"
                >
                    <X size={14} /> Cancelar
                </button>
            </div>
        </div>
    );
}
