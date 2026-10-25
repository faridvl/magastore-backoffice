import React from 'react';
import { MapPin, Plus, Trash2, Loader2, Star } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/common/modal/modal';
import { Badge } from '@/components/common/badge/badge';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { BadgeTone } from '@/shared/constants/status-labels';
import { LocationSelectFields } from '@/components/common/location-select-fields/location-select-fields';
import { CustomerAddress, CustomerAddressUpdateInput } from '@/types/customer/customer.types';
import { useCustomerAddressMutations } from '@/shared/api/mutations/customers/use-customer-address-mutations';

const ADDRESS_LABELS = ['Casa', 'Oficina', 'Casa de familiar', 'Otro'];

const SELECT_CLASSNAME =
  'w-full min-h-[44px] bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-amber-500 transition-all font-medium text-slate-700 disabled:opacity-50';
const LABEL_CLASSNAME = 'text-sm font-semibold text-slate-700 ml-1';
const ROW_ACTION_CLASSNAME =
  'flex items-center gap-1 px-3 min-h-[44px] rounded-xl text-sm font-semibold transition-colors disabled:opacity-50';
const PRINCIPAL_ADDRESS_LABEL = 'principal';

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
  /**
   * Lista ya actualizada que devuelve el endpoint tras cada alta, edición o
   * borrado. La necesita quien no lee las direcciones por React Query —el
   * asistente de nueva orden las carga a estado local—, porque para ese caso
   * invalidar la caché no refresca nada.
   */
  onSaved?: (addresses: CustomerAddress[]) => void;
  /** Abre con el formulario de alta ya visible, para quien llega solo a agregar. */
  startWithNewAddress?: boolean;
}

/**
 * Gestión de direcciones sin entrar al modo edición del cliente completo.
 * Antes "Agregar dirección" abría el formulario entero (nombre, correo, tipo de
 * cliente…), lo que obligaba a reenviar y revalidar datos que nadie iba a tocar.
 */
export const CustomerAddressesModal: React.FC<Props> = ({
  customerId,
  addresses,
  onClose,
  onSaved,
  startWithNewAddress = false,
}) => {
  const { saveAddress, isSaving, deleteAddress, isDeleting } = useCustomerAddressMutations(customerId);
  const [draft, setDraft] = React.useState<Draft | null>(
    startWithNewAddress ? { ...EMPTY_DRAFT, is_default: addresses.length === 0 } : null,
  );
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
      const { data } = await saveAddress(draft);
      onSaved?.(data);
      toast.success(draft.id ? 'Dirección actualizada' : 'Dirección agregada');
      setDraft(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo guardar la dirección.');
    }
  };

  const handleDelete = async (addressId: string) => {
    try {
      const { data } = await deleteAddress(addressId);
      onSaved?.(data);
      toast.success('Dirección eliminada');
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo eliminar la dirección.');
    }
  };

  const handleMakeDefault = async (addr: CustomerAddress) => {
    try {
      const { data } = await saveAddress({ ...addr, is_default: true });
      onSaved?.(data);
      toast.success('Dirección principal actualizada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar la dirección principal.');
    }
  };

  const footer = draft ? (
    <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
      <Button variant={ButtonVariant.CANCEL} onClick={() => setDraft(null)} disabled={isSaving}>
        Cancelar
      </Button>
      <button
        onClick={handleSave}
        disabled={isSaving}
        className="flex items-center justify-center gap-2 min-h-[44px] px-5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-60"
      >
        {isSaving ? <><Loader2 size={14} className="animate-spin" /> Guardando...</> : 'Guardar dirección'}
      </button>
    </div>
  ) : undefined;

  return (
    <Modal
      title="Direcciones"
      subtitle="La principal se usa por defecto al crear órdenes de envío."
      onClose={onClose}
      className="sm:max-w-2xl"
      footer={footer}
    >
      <div className="space-y-3">
        {addresses.map((addr) => {
          const addressLabel = addr.address_label || 'Dirección';
          // Si la etiqueta ya dice "Principal" el badge repetiría lo mismo.
          const showDefaultBadge = addr.is_default && addressLabel.trim().toLowerCase() !== PRINCIPAL_ADDRESS_LABEL;
          return (
            <div key={addr.id} className="p-4 bg-slate-50/70 rounded-2xl border border-slate-100">
              <div className="flex items-start gap-3 min-w-0">
                <div className="p-2 bg-white rounded-xl text-primary shadow-sm border border-slate-100 flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-slate-800">{addressLabel}</span>
                    {showDefaultBadge && <Badge tone={BadgeTone.NEUTRAL}>Principal</Badge>}
                  </div>
                  <p className="text-sm text-slate-600 font-medium mt-1 break-words">
                    {addr.province}, {addr.canton}, {addr.district}
                    <br />
                    {addr.exact_address}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100 flex-wrap">
                <button
                  onClick={() => setDraft({ ...addr })}
                  disabled={isBusy}
                  className={`${ROW_ACTION_CLASSNAME} text-slate-600 hover:bg-white hover:text-primary`}
                >
                  Editar
                </button>
                {!addr.is_default && (
                  <button
                    onClick={() => handleMakeDefault(addr)}
                    disabled={isBusy}
                    className={`${ROW_ACTION_CLASSNAME} text-slate-600 hover:bg-white hover:text-amber-600`}
                  >
                    <Star size={14} /> Hacer principal
                  </button>
                )}
                {addresses.length > 1 && (
                  confirmDeleteId === addr.id ? (
                    <span className="flex items-center gap-1 ml-auto">
                      <button
                        onClick={() => handleDelete(addr.id)}
                        disabled={isBusy}
                        className={`${ROW_ACTION_CLASSNAME} bg-red-500 text-white hover:bg-red-600`}
                      >
                        {isDeleting ? 'Eliminando...' : 'Confirmar'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className={`${ROW_ACTION_CLASSNAME} text-slate-500 hover:bg-white`}
                      >
                        Cancelar
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(addr.id)}
                      disabled={isBusy}
                      className={`${ROW_ACTION_CLASSNAME} ml-auto text-slate-500 hover:bg-white hover:text-red-600`}
                    >
                      <Trash2 size={14} /> Eliminar
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}

        {/* Formulario de alta/edición */}
        {draft ? (
          <div className="p-4 bg-amber-50/40 rounded-2xl border-2 border-amber-200 space-y-4">
            <p className="text-sm font-bold text-amber-800">
              {draft.id ? 'Editando dirección' : 'Nueva dirección'}
            </p>

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
                <textarea
                  rows={2}
                  value={draft.exact_address}
                  onChange={(e) => updateDraft('exact_address', e.target.value)}
                  placeholder="Casa 12, frente al parque"
                  className={`${SELECT_CLASSNAME} resize-none`}
                />
              </div>
              <div className="space-y-1.5">
                <label className={LABEL_CLASSNAME}>Etiqueta</label>
                <select
                  value={draft.address_label ?? 'Casa'}
                  onChange={(e) => updateDraft('address_label', e.target.value)}
                  className={SELECT_CLASSNAME}
                >
                  {(draft.address_label && !ADDRESS_LABELS.includes(draft.address_label) ? [...ADDRESS_LABELS, draft.address_label] : ADDRESS_LABELS).map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={() => updateDraft('is_default', !draft.is_default)}
              className="flex items-center gap-3 min-h-[44px]"
              aria-pressed={draft.is_default}
            >
              <span className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ${draft.is_default ? 'bg-amber-500' : 'bg-slate-300'}`}>
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${draft.is_default ? 'translate-x-4' : 'translate-x-1'}`} />
              </span>
              <span className="text-sm font-semibold text-slate-600">Marcar como principal</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setDraft({ ...EMPTY_DRAFT, is_default: addresses.length === 0 })}
            className="w-full flex items-center justify-center gap-2 min-h-[44px] py-3 border-2 border-dashed border-slate-200 rounded-2xl text-sm font-semibold text-slate-500 hover:border-amber-300 hover:text-amber-600 transition-all"
          >
            <Plus size={14} /> Agregar dirección
          </button>
        )}
      </div>
    </Modal>
  );
};
