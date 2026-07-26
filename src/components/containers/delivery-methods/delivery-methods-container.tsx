import React from 'react';
import { Truck, Plus, Pencil, Check, X, Power } from 'lucide-react';
import { useDeliveryMethods, DeliveryMethodDraft } from './use-delivery-methods';

export const DeliveryMethodsContainer: React.FC = () => {
    const {
        methods,
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
    } = useDeliveryMethods();

    return (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-50 rounded-xl">
                        <Truck size={15} className="text-amber-500" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-slate-800">Métodos de Entrega</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                            Catálogo usado al crear órdenes de envío y facturar. El código no se puede reutilizar entre métodos.
                        </p>
                    </div>
                </div>
                <button
                    onClick={openNewRow}
                    disabled={showNewRow}
                    className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-xl text-[11px] font-bold hover:bg-amber-100 transition-all disabled:opacity-40"
                >
                    <Plus size={13} /> Agregar método
                </button>
            </div>

            <div className="divide-y divide-slate-100">
                {showNewRow && (
                    <DeliveryMethodForm
                        draft={newDraft}
                        onChange={updateNewDraft}
                        onSave={saveNewRow}
                        onCancel={cancelNewRow}
                        isSaving={isCreating}
                    />
                )}

                {isLoading ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">Cargando...</p>
                ) : methods.length === 0 && !showNewRow ? (
                    <p className="px-5 py-8 text-center text-slate-400 text-xs">
                        Sin métodos configurados. Usa &quot;Agregar método&quot; para crear el primero.
                    </p>
                ) : methods.map((method) => (
                    editingUuid === method.uuid ? (
                        <DeliveryMethodForm
                            key={method.uuid}
                            draft={editDraft}
                            onChange={updateEditDraft}
                            onSave={saveEdit}
                            onCancel={cancelEdit}
                            isSaving={isUpdating}
                        />
                    ) : (
                        <div key={method.uuid} className={`px-5 py-4 flex items-center justify-between gap-3 ${!method.is_active ? 'opacity-40' : ''}`}>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                    <p className="text-sm font-bold text-slate-800">{method.name}</p>
                                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                        {method.code}
                                    </span>
                                    {method.is_pickup && (
                                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-sky-50 text-sky-700">
                                            Retiro (sin entrega)
                                        </span>
                                    )}
                                </div>
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                    {method.is_pickup
                                        ? 'No cobra tarifa de entrega ni distingue zona.'
                                        : method.requires_zone
                                            ? 'Distingue tarifa por zona GAM/Resto.'
                                            : 'Tarifa única, sin distinción de zona.'}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={() => handleToggleActive(method)}
                                    disabled={isToggling}
                                    title={method.is_active ? 'Desactivar' : 'Activar'}
                                    className={`p-2.5 rounded-lg transition-colors ${method.is_active ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-300 hover:bg-slate-50'}`}
                                >
                                    <Power size={15} />
                                </button>
                                <button
                                    onClick={() => startEdit(method)}
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

function DeliveryMethodForm({
    draft,
    onChange,
    onSave,
    onCancel,
    isSaving,
}: {
    draft: DeliveryMethodDraft;
    onChange: (field: keyof DeliveryMethodDraft, value: string | boolean) => void;
    onSave: () => void;
    onCancel: () => void;
    isSaving: boolean;
}) {
    const inputClass = 'w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-amber-400/30 focus:border-amber-400';
    const labelClass = 'text-[10px] font-semibold text-slate-500 uppercase tracking-wider';

    return (
        <div className="px-5 py-5 bg-amber-50/30 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Nombre</label>
                    <input type="text" value={draft.name} onChange={(e) => onChange('name', e.target.value)} placeholder="Ej. Encomienda Tracopa" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                    <label className={labelClass}>Código</label>
                    <input
                        type="text"
                        value={draft.code}
                        onChange={(e) => onChange('code', e.target.value.toUpperCase())}
                        placeholder="Ej. TRACOPA"
                        className={`${inputClass} uppercase`}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                    <input
                        type="checkbox"
                        checked={draft.is_pickup}
                        onChange={(e) => onChange('is_pickup', e.target.checked)}
                        className="rounded border-slate-300"
                    />
                    Es retiro en oficina (no cobra entrega, no distingue zona)
                </label>
                {!draft.is_pickup && (
                    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                            type="checkbox"
                            checked={draft.requires_zone}
                            onChange={(e) => onChange('requires_zone', e.target.checked)}
                            className="rounded border-slate-300"
                        />
                        Distingue tarifa por zona (GAM / Resto)
                    </label>
                )}
            </div>

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
