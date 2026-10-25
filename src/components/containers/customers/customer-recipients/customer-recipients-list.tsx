import React from 'react';
import { Check, Plus, UserRound } from 'lucide-react';
import { toast } from 'sonner';
import { tailwind } from '@/utils/tailwind-utils';
import { applyPhoneMask } from '@/shared/utils/customer-masks';
import { CustomerRecipientInput } from '@/types/customer/customer.types';
import { useCustomerRecipientsQuery } from '@/shared/api/querys/customers/use-customer-recipients-query';
import { useCustomerRecipientMutations } from '@/shared/api/mutations/customers/use-customer-recipient-mutations';

const INPUT_CLASSNAME =
  'w-full min-h-[44px] bg-white border border-slate-200 rounded-xl px-4 text-base text-slate-800 outline-none focus:ring-2 focus:ring-slate-200';
const EMPTY_DRAFT: CustomerRecipientInput = { full_name: '', phone: '', id_card: '' };

interface Props {
  customerId: string;
  customerName: string;
  /** Con onSelect las filas se eligen; sin él la lista solo administra personas. */
  selectedId?: string | null;
  onSelect?: (recipientId: string | null) => void;
}

/**
 * Personas que reciben por el cliente. "El cliente" va siempre primero: es el
 * caso normal y no hace falta registrarlo.
 */
export const CustomerRecipientsList: React.FC<Props> = ({ customerId, customerName, selectedId = null, onSelect }) => {
  const { data, isLoading, isError, refetch } = useCustomerRecipientsQuery(customerId);
  const { saveRecipient, isSaving, deleteRecipient, isDeleting } = useCustomerRecipientMutations(customerId);
  const [draft, setDraft] = React.useState<CustomerRecipientInput | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);
  const recipients = data?.data ?? [];
  const isSelectable = !!onSelect;

  const handleSave = async () => {
    if (!draft?.full_name.trim()) {
      toast.error('Escribe el nombre de quien recibe.');
      return;
    }
    try {
      const previousIds = new Set(recipients.map((r) => r.id));
      const { data: saved } = await saveRecipient(draft);
      const created = saved.find((r) => !previousIds.has(r.id));
      // Quien se agrega desde una orden es para esa orden: queda elegida.
      if (created && onSelect) onSelect(created.id);
      toast.success(draft.id ? 'Persona actualizada' : 'Persona agregada');
      setDraft(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo guardar la persona.');
    }
  };

  const handleDelete = async (recipientId: string) => {
    try {
      await deleteRecipient(recipientId);
      if (selectedId === recipientId) onSelect?.(null);
      toast.success('Persona eliminada');
      setConfirmDeleteId(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la persona.');
    }
  };

  const optionClass = (isSelected: boolean) => tailwind(
    'w-full flex items-center gap-3 px-4 py-3 rounded-2xl border text-left transition-colors',
    isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'bg-slate-50 border-transparent text-slate-800',
    isSelectable && !isSelected && 'hover:border-slate-200',
  );

  if (isLoading) return <p className="text-sm text-slate-500 py-3">Cargando personas…</p>;
  if (isError) {
    return (
      <div className="flex items-center gap-3 py-3">
        <p className="text-sm text-slate-500">No se pudieron cargar las personas.</p>
        <button type="button" onClick={() => refetch()} className="text-sm font-semibold text-slate-800 underline underline-offset-2">
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {isSelectable && (
        <button type="button" onClick={() => onSelect?.(null)} className={optionClass(selectedId === null)}>
          <UserRound size={16} className="flex-shrink-0 opacity-70" />
          <span className="flex-1 min-w-0">
            <span className="block text-sm font-bold truncate">{customerName}</span>
            <span className={`block text-xs ${selectedId === null ? 'text-slate-300' : 'text-slate-500'}`}>El cliente</span>
          </span>
          {selectedId === null && <Check size={16} className="text-amber-400 flex-shrink-0" />}
        </button>
      )}

      {recipients.map((r) => {
        const isSelected = selectedId === r.id;
        const detail = [r.phone, r.id_card && `Cédula ${r.id_card}`].filter(Boolean).join(' · ');
        return (
          <div key={r.id} className="space-y-1">
            {isSelectable ? (
              <button type="button" onClick={() => onSelect?.(r.id)} className={optionClass(isSelected)}>
                <UserRound size={16} className="flex-shrink-0 opacity-70" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold break-words">{r.full_name}</span>
                  {detail && <span className={`block text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>{detail}</span>}
                </span>
                {isSelected && <Check size={16} className="text-amber-400 flex-shrink-0" />}
              </button>
            ) : (
              <div className={optionClass(false)}>
                <UserRound size={16} className="flex-shrink-0 opacity-70" />
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-bold break-words">{r.full_name}</span>
                  {detail && <span className="block text-xs text-slate-500">{detail}</span>}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1 pl-1">
              <button
                type="button"
                onClick={() => setDraft({ id: r.id, full_name: r.full_name, phone: r.phone ? applyPhoneMask(r.phone) : '', id_card: r.id_card ?? '' })}
                className="min-h-[44px] px-3 text-sm font-semibold text-slate-500 hover:text-slate-900"
              >
                Editar
              </button>
              {confirmDeleteId === r.id ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleDelete(r.id)}
                    disabled={isDeleting}
                    className="min-h-[44px] px-3 text-sm font-bold text-red-600"
                  >
                    {isDeleting ? 'Eliminando…' : 'Sí, eliminar'}
                  </button>
                  <button type="button" onClick={() => setConfirmDeleteId(null)} className="min-h-[44px] px-3 text-sm font-semibold text-slate-500">
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteId(r.id)}
                  className="min-h-[44px] px-3 text-sm font-semibold text-slate-500 hover:text-red-600"
                >
                  Eliminar
                </button>
              )}
            </div>
          </div>
        );
      })}

      {!isSelectable && recipients.length === 0 && !draft && (
        <p className="text-sm text-slate-500 py-2">Solo recibe el cliente.</p>
      )}

      {draft ? (
        <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3">
          <p className="text-sm font-bold text-slate-900">{draft.id ? 'Editar persona' : 'Nueva persona que recibe'}</p>
          <input
            value={draft.full_name}
            onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
            placeholder="Nombre completo"
            className={INPUT_CLASSNAME}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={draft.phone ?? ''}
              onChange={(e) => setDraft({ ...draft, phone: applyPhoneMask(e.target.value) })}
              placeholder="+506 8888-7777"
              inputMode="tel"
              className={INPUT_CLASSNAME}
            />
            <input
              value={draft.id_card ?? ''}
              onChange={(e) => setDraft({ ...draft, id_card: e.target.value })}
              placeholder="Cédula"
              className={INPUT_CLASSNAME}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setDraft(null)}
              disabled={isSaving}
              className="flex-1 min-h-[44px] rounded-xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 min-h-[44px] rounded-xl bg-slate-900 text-white text-sm font-bold disabled:opacity-50"
            >
              {isSaving ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDraft({ ...EMPTY_DRAFT })}
          className="w-full flex items-center justify-center gap-2 min-h-[44px] border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-500 hover:border-slate-300 hover:text-slate-700"
        >
          <Plus size={14} /> Agregar persona
        </button>
      )}
    </div>
  );
};
