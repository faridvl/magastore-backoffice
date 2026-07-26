import React from 'react';
import { MapPin, Plus, Trash2, Loader2, X, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { LocationSelectFields } from '@/components/common/location-select-fields/location-select-fields';
import { CustomerAddress, CustomerAddressUpdateInput } from '@/types/customer/customer.types';
import { useCustomerAddressMutations } from '@/shared/api/mutations/customers/use-customer-address-mutations';

const ADDRESS_LABELS = ['Casa', 'Oficina', 'Casa de familiar', 'Otro'];

const SELECT_CLASSNAME =
  'w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700 disabled:opacity-50';
const LABEL_CLASSNAME = 'text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest';

type Draft = CustomerAddressUpdateInput & { id?: string };

const EMPTY_DRAFT: Draft = {
  province: '',
  canton: '',
  district: '',
  exact_address: '',
  address_label: 'Casa',
  is_default: false,
};

interface Props {
  customerId: string;
  addresses: CustomerAddress[];
  onClose: () => void;
}

/**
 * Gestión de direcciones sin entrar al modo edición del cliente completo.
 * Antes "Agregar dirección" abría el formulario entero (nombre, correo, tipo de
 * cliente…), lo que obligaba a reenviar y revalidar datos que nadie iba a tocar.
 */
export const CustomerAddressesModal: React.FC<Props> = ({ customerId, addresses, onClose }) => {
  const { saveAddress, isSaving, deleteAddress, isDeleting } = useCustomerAddressMutations(customerId);
  const [draft, setDraft] = React.useState<Draft | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = React.useState<string | null>(null);

  const isBusy = isSaving || isDeleting;

  const updateDraft = (field: keyof Draft, value: string | boolean) => {
    setDraft((prev) => {
      if (!prev) return prev;
      // Cambiar provincia o cantón invalida los niveles inferiores.
      if (field === 'province') return { ...prev, province: value as string, canton: '', district: '' };
      if (field === 'canton') return { ...prev, canton: value as string, district: '' };
      return { ...prev, [field]: value };
    });
  };

  const handleSave = async () => {
    if (!draft) return;
    if (!draft.province || !draft.canton || !draft.district || !draft.exact_address.trim()) {
      toast.error('Completa provincia, cantón, distrito y dirección exacta.');
      return;
    }
    try {
      await saveAddress(draft);
      toast.success(draft.id ? 'Dirección actualizada' : 'Dirección agregada');
      setDraft(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar la dirección.');
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      await deleteAddress(addressId);
      toast.success('Dirección eliminada');
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo eliminar la dirección.');
    }
  };

  const handleMakeDefault = async (addr: CustomerAddress) => {
    try {
      await saveAddress({ ...addr, is_default: true });
      toast.success('Dirección principal actualizada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar la dirección principal.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      {/* Hoja completa en mobile, tarjeta centrada desde sm — el formulario de
          dirección es alto y en un teléfono no cabe como diálogo flotante. */}
      <div
        className="bg-white w-full sm:max-w-2xl rounded-t-[28px] sm:rounded-[28px] shadow-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 p-5 sm:p-6 border-b border-slate-100 flex-shrink-0">
          <div className="min-w-0">
            <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Direcciones</Typography>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5">
              La principal se usa por defecto al crear órdenes de envío.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-2xl text-slate-400 hover:bg-slate-50 hover:text-slate-600 transition-colors flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-3">
          {addresses.map((addr) => (
            <div key={addr.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-white rounded-xl text-primary shadow-sm border border-slate-100 flex-shrink-0">
                    <MapPin size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-800">{addr.address_label}</span>
                      {addr.is_default && (
                        <span className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase">
                          Principal
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 font-medium mt-1 break-words">
                      {addr.province}, {addr.canton}, {addr.district}
                      <br />
                      {addr.exact_address}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                <button
                  onClick={() => setDraft({ ...addr })}
                  disabled={isBusy}
                  className="px-3 min-h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-white hover:text-primary transition-colors disabled:opacity-50"
                >
                  Editar
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => handleMakeDefault(addr)}
                    disabled={isBusy}
                    className="flex items-center gap-1 px-3 min-h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-500 hover:bg-white hover:text-amber-600 transition-colors disabled:opacity-50"
                  >
                    <Star size={11} /> Hacer principal
                  </button>
                )}
                {addresses.length > 1 && (
                  confirmDeleteId === addr.id ? (
                    <span className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleDelete(addr.id)}
                        disabled={isBusy}
                        className="px-3 min-h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                      >
                        {isDeleting ? 'Eliminando...' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="px-3 min-h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:bg-white transition-colors"
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(addr.id)}
                      disabled={isBusy}
                      className="flex items-center gap-1 ml-auto px-3 min-h-[38px] rounded-xl text-[10px] font-black uppercase tracking-wider text-slate-400 hover:bg-white hover:text-red-500 transition-colors disabled:opacity-50"
                    >
                      <Trash2 size={11} /> Eliminar
                    </button>
                  )
                )}
              </div>
            </div>
          ))}

          {/* Formulario de alta/edición */}
          {draft ? (
            <div className="p-4 bg-amber-50/40 rounded-2xl border-2 border-amber-200 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                  {draft.id ? 'Editando dirección' : 'Nueva dirección'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LocationSelectFields
                  province={draft.province}
                  canton={draft.canton}
                  district={draft.district}
                  onChange={(field, value) => updateDraft(field as keyof Draft, value)}
                  selectClassName={SELECT_CLASSNAME}
                  labelClassName={LABEL_CLASSNAME}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className={LABEL_CLASSNAME}>Dirección exacta</label>
                  <input
                    value={draft.exact_address}
                    onChange={(e) => updateDraft('exact_address', e.target.value)}
                    placeholder="Casa 12, frente al parque"
                    className={SELECT_CLASSNAME}
                  />
                </div>
                <div className="space-y-1.5">
                  <label className={LABEL_CLASSNAME}>Etiqueta</label>
                  <select
                    value={draft.address_label ?? 'Casa'}
                    onChange={(e) => updateDraft('address_label', e.target.value)}
                    className={SELECT_CLASSNAME}
                  >
                    {ADDRESS_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="button"
                onClick={() => updateDraft('is_default', !draft.is_default)}
                className="flex items-center gap-3 min-h-[44px]"
              >
                <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${draft.is_default ? 'bg-amber-500' : 'bg-slate-300'}`}>
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${draft.is_default ? 'translate-x-4' : 'translate-x-1'}`} />
                </span>
                <span className="text-xs font-semibold text-slate-600">Marcar como principal</span>
              </button>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setDraft(null)}
                  disabled={isSaving}
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-[2] py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {isSaving ? <><Loader2 size={13} className="animate-spin" /> Guardando...</> : 'Guardar dirección'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setDraft({ ...EMPTY_DRAFT, is_default: addresses.length === 0 })}
              className="w-full flex items-center justify-center gap-2 py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-400 hover:border-amber-300 hover:text-amber-600 transition-all"
            >
              <Plus size={14} /> Agregar dirección
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
