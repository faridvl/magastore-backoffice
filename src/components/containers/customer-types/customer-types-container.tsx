import React from 'react';
import { Users, Plus, Pencil, Check, X, Power } from 'lucide-react';
import { useCustomerTypes, CustomerTypeDraft } from './use-customer-types';
import { CustomerBillingMode } from '@/types/customer/customer.types';

const BILLING_MODE_OPTIONS: { value: CustomerBillingMode; label: string; desc: string }[] = [
    {
        value: CustomerBillingMode.NORMAL,
        label: 'Cobro normal',
        desc: 'Paga la tarifa completa por libra que está configurada en el sistema',
    },
    {
        value: CustomerBillingMode.AL_COSTO,
        label: 'Sin ganancia',
        desc: 'Solo paga lo que costó traer el paquete. Magastore no gana nada — para socios y familia',
    },
    {
        value: CustomerBillingMode.DESCUENTO,
        label: 'Con descuento',
        desc: 'Paga la tarifa por libra con un porcentaje de rebaja',
    },
];

const MODE_STYLES: Record<string, string> = {
    NORMAL: 'bg-slate-100 text-slate-600',
    AL_COSTO: 'bg-sky-50 text-sky-700',
    DESCUENTO: 'bg-amber-50 text-amber-700',
};

export const CustomerTypesContainer: React.FC = () => {
    const {
        types,
        isLoading,
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
    } = useCustomerTypes();

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-xl">
                        <Users size={15} className="text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Tipos de Cliente</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Definen cómo se cobra el flete. La entrega local (Correos/encomienda) siempre se cobra completa.
                        </p>
                    </div>
                </div>
                <button
                    onClick={openNewRow}
                    disabled={showNewRow}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-[11px] font-bold hover:bg-amber-100 transition-all disabled:opacity-40"
                >
                    <Plus size={13} /> Agregar tipo
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {showNewRow && (
                    <CustomerTypeForm
                        draft={newDraft}
                        onChange={updateNewDraft}
                        onSave={saveNewRow}
                        onCancel={cancelNewRow}
                        isSaving={isCreating}
                    />
                )}

                {isLoading ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">Cargando...</p>
                ) : types.length === 0 && !showNewRow ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">
                        Sin tipos configurados. Usa &quot;Agregar tipo&quot; para crear el primero.
                    </p>
                ) : types.map((type) => (
                    editingUuid === type.uuid ? (
                        <CustomerTypeForm
                            key={type.uuid}
                            draft={editDraft}
                            onChange={updateEditDraft}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div key={type.uuid} className={`px-5 py-4 flex items-center justify-between gap-3 ${!type.is_active ? 'opacity-40' : ''}`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-slate-800">{type.name}</p>
                                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${MODE_STYLES[type.billing_mode] ?? 'bg-slate-100 text-slate-500'}`}>
                                        {BILLING_MODE_OPTIONS.find((o) => o.value === type.billing_mode)?.label ?? type.billing_mode}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {type.billing_mode === CustomerBillingMode.DESCUENTO
                                        ? `${Number(type.discount_percent)}% de descuento sobre el flete`
                                        : BILLING_MODE_OPTIONS.find((o) => o.value === type.billing_mode)?.desc}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => handleToggleActive(type)}
                                    disabled={isToggling}
                                    title={type.is_active ? 'Desactivar' : 'Activar'}
                                    className={`p-2.5 rounded-lg transition-colors ${type.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                >
                                    <Power size={15} />
                                </button>
                                <button
                                    onClick={() => startEdit(type)}
                                    className="p-2.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                                    title="Editar"
                                >
                                    <Pencil size={15} />
                                </button>
                            </div>
                        </div>
                    )
                ))}
            </div>
        </div>
    );
};

function CustomerTypeForm({
    draft,
    onChange,
    onSave,
    onCancel,
    isSaving,
}: {
    draft: CustomerTypeDraft;
    onChange: (field: keyof CustomerTypeDraft, value: string) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const inputClass = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400';
    const labelClass = 'text-[10px] font-semibold text-slate-500 uppercase tracking-wider';
    const isDiscount = draft.billing_mode === CustomerBillingMode.DESCUENTO;

    return (
        <div className="px-5 py-5 bg-amber-50/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Nombre</label>
                    <input type="text" value={draft.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Ej. Socio / Familia" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Modo de cobro</label>
                    <select value={draft.billing_mode} onChange={(e) => onChange('billing_mode', e.target.value)} className={inputClass}>
                        {BILLING_MODE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                </div>
                {isDiscount && (
                    <div className="flex flex-col gap-1">
                        <label className={labelClass}>Descuento (%)</label>
                        <input type="number" step="0.01" min="0" max="100" inputMode="decimal" value={draft.discount_percent} onChange={(e) => onChange('discount_percent', e.target.value)} placeholder="10" className={inputClass} />
                    </div>
                )}
            </div>

            <p className="text-[11px] text-slate-500">
                {BILLING_MODE_OPTIONS.find((o) => o.value === draft.billing_mode)?.desc}
            </p>

            <div className="flex gap-2">
                <button
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-40"
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
