import React from 'react';
import { Plus, MapPin, Loader2 } from 'lucide-react';

const ADDRESS_LABELS = ['Casa', 'Oficina', 'Casa de familiar', 'Otro'];
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { LocationSelectFields } from '@/components/common/location-select-fields/location-select-fields';
import { CustomerUpdateInput, CustomerAddressUpdateInput, IdType, CustomerType, CustomerBillingMode } from '@/types/customer/customer.types';
import { applyIdMask, applyPhoneMask, validateIdCard, idCardPlaceholder, ID_TYPE_OPTIONS } from '@/shared/utils/customer-masks';

const LOCATION_SELECT_CLASSNAME = 'w-full bg-slate-50 border border-slate-100 rounded-[16px] px-5 py-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all font-medium text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed';
const LOCATION_LABEL_CLASSNAME = 'text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest';

const ID_TYPES = ID_TYPE_OPTIONS;

interface CustomerEditFormProps {
  form: CustomerUpdateInput;
  customerTypes: CustomerType[];
  isSaving: boolean;
  error: string | null;
  onFieldChange: (field: keyof Omit<CustomerUpdateInput, 'addresses'>, value: string | boolean | number | null) => void;
  onAddressChange: (index: number, field: keyof CustomerAddressUpdateInput, value: string | boolean) => void;
  onAddAddress: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const FieldInput = ({ label, value, onChange, type = 'text', disabled = false, placeholder, error }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
  placeholder?: string;
  error?: string;
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      className={`w-full bg-slate-50 border rounded-[16px] px-5 py-4 focus:ring-2 focus:ring-primary/30 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-100 focus:border-primary'}`}
    />
    {error && <p className="text-xs text-red-500 font-semibold ml-1">{error}</p>}
  </div>
);

export const CustomerEditForm: React.FC<CustomerEditFormProps> = ({
  form,
  customerTypes,
  isSaving,
  error,
  onFieldChange,
  onAddressChange,
  onAddAddress,
  onSave,
  onCancel,
}) => {
  // Solo se marca error cuando ya hay algo escrito: un campo vacío recién
  // abierto no debería aparecer en rojo.
  const idCardError = form.id_card?.trim()
    ? validateIdCard(form.id_card, form.id_type ?? 'FISICA')
    : undefined;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Datos Personales */}
      <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div>
          <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Datos Personales</Typography>
          {/* El servicio normaliza a mayúsculas al guardar: avisarlo evita que
              parezca que el sistema "cambió" lo que el operador escribió. */}
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Nombre, apellidos, cédula y direcciones se guardan en mayúsculas. El correo, en minúsculas.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <FieldInput
            label="Nombre"
            value={form.first_name}
            onChange={(v) => onFieldChange('first_name', v)}
          />
          <FieldInput
            label="Apellidos"
            value={form.last_name}
            onChange={(v) => onFieldChange('last_name', v)}
          />
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Tipo de ID</label>
            <select
              value={form.id_type ?? 'FISICA'}
              // Cambiar el tipo reformatea el número al vuelo en vez de
              // descartarlo: en edición el dato ya existe y borrarlo obligaría
              // a teclearlo de nuevo.
              onChange={(e) => {
                const nextType = e.target.value as IdType;
                onFieldChange('id_type', nextType);
                if (form.id_card) onFieldChange('id_card', applyIdMask(form.id_card, nextType));
              }}
              className="w-full bg-slate-50 border border-slate-100 rounded-[16px] px-5 py-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all font-medium text-slate-700"
            >
              {ID_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          {/* Mismas máscaras que el alta: antes este formulario aceptaba
              cualquier texto y permitía guardar cédulas con un formato que el
              alta nunca habría dejado pasar. */}
          <FieldInput
            label="Número de Cédula"
            value={form.id_card ?? ''}
            onChange={(v) => onFieldChange('id_card', applyIdMask(v, form.id_type ?? 'FISICA'))}
            placeholder={idCardPlaceholder(form.id_type ?? 'FISICA')}
            error={idCardError}
          />
          <FieldInput
            label="Correo Electrónico"
            type="email"
            value={form.email}
            onChange={(v) => onFieldChange('email', v)}
          />
          <FieldInput
            label="Teléfono"
            value={form.phone}
            placeholder="+506 0000-0000"
            onChange={(v) => onFieldChange('phone', applyPhoneMask(v))}
          />
        </div>

        <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
          <Typography variant={TypographyVariant.BODY} className="text-slate-600 flex-1">Estado del cliente</Typography>
          <button
            type="button"
            onClick={() => onFieldChange('is_active', !form.is_active)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              form.is_active ? 'bg-green-500' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                form.is_active ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <Typography variant={TypographyVariant.BODY_SEMIBOLD} className={form.is_active ? 'text-emerald-600' : 'text-slate-400'}>
            {form.is_active ? 'Activo' : 'Inactivo'}
          </Typography>
        </div>
      </div>

      {/* Tipo de cliente — sección propia: enterrado como un <select> más entre
          seis campos, el operador no lo encontraba y creía que no se podía
          cambiar. Tarjetas grandes, igual que en el alta. */}
      <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-sm space-y-4">
        <div>
          <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Tipo de Cliente</Typography>
          <p className="text-[11px] font-medium text-slate-400 mt-1">
            Define cómo se le cobra el flete. La entrega local siempre se cobra completa.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {customerTypes.map((t) => {
            const isSelected = form.customer_type_id === t.id;
            return (
              <button
                type="button"
                key={t.id}
                onClick={() => onFieldChange('customer_type_id', t.id)}
                className={`text-left p-4 rounded-2xl border-2 transition-all ${isSelected ? 'border-amber-600 bg-amber-50/30 shadow-md' : 'border-slate-100 bg-slate-50/50 hover:border-slate-200'}`}
              >
                <span className="flex items-center gap-2">
                  <span className={`w-4 h-4 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${isSelected ? 'border-amber-600' : 'border-slate-300'}`}>
                    {isSelected && <span className="w-2 h-2 rounded-full bg-amber-600" />}
                  </span>
                  <span className="text-sm font-bold text-slate-700 truncate">{t.name}</span>
                </span>
                <span className="block text-[11px] font-medium text-slate-400 mt-1.5 ml-6">
                  {t.billing_mode === CustomerBillingMode.AL_COSTO
                    ? 'Solo paga el costo, sin ganancia'
                    : t.billing_mode === CustomerBillingMode.DESCUENTO
                      ? `${Number(t.discount_percent)}% de rebaja sobre el flete`
                      : 'Paga la tarifa completa por libra'}
                </span>
              </button>
            );
          })}
        </div>

        {form.customer_type_id == null && (
          <p className="text-[11px] font-medium text-amber-600">
            Este cliente no tiene tipo asignado: se le cobra tarifa de lista.
          </p>
        )}
      </div>

      {/* Direcciones */}
      <div className="bg-white p-5 sm:p-8 rounded-[24px] sm:rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <div className="flex justify-between items-center">
          <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Direcciones</Typography>
          <button
            type="button"
            onClick={onAddAddress}
            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/5 px-4 py-2 rounded-2xl hover:bg-primary/10 transition-all"
          >
            <Plus size={12} /> Agregar
          </button>
        </div>

        {(form.addresses ?? []).map((addr, index) => (
          <div key={addr.id ?? `new-${index}`} className="p-6 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <MapPin size={14} className="text-primary" />
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-sm">
                {addr.address_label || `Dirección ${index + 1}`}
                {addr.is_default && (
                  <span className="ml-2 bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Principal</span>
                )}
                {!addr.id && (
                  <span className="ml-2 bg-emerald-100 text-emerald-700 text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Nueva</span>
                )}
              </Typography>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <LocationSelectFields
                province={addr.province}
                canton={addr.canton}
                district={addr.district}
                onChange={(field, value) => onAddressChange(index, field, value)}
                selectClassName={LOCATION_SELECT_CLASSNAME}
                labelClassName={LOCATION_LABEL_CLASSNAME}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput label="Dirección Exacta" value={addr.exact_address} onChange={(v) => onAddressChange(index, 'exact_address', v)} />
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">Etiqueta</label>
                <select
                  value={addr.address_label ?? 'Casa'}
                  onChange={(e) => onAddressChange(index, 'address_label', e.target.value)}
                  className="w-full bg-slate-50 border border-slate-100 rounded-[16px] px-5 py-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all font-medium text-slate-700"
                >
                  {ADDRESS_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => onAddressChange(index, 'is_default', !(addr.is_default ?? false))}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${addr.is_default ? 'bg-amber-500' : 'bg-slate-300'}`}
              >
                <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${addr.is_default ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <Typography variant={TypographyVariant.BODY} className="text-slate-600 text-sm">Marcar como dirección principal</Typography>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
          <Typography variant={TypographyVariant.BODY} className="text-red-600 text-sm">{error}</Typography>
        </div>
      )}

      {/* Acciones — barra sticky al fondo */}
      <div className="sticky bottom-0 bg-white/90 backdrop-blur-sm border-t border-slate-100 rounded-b-[32px] px-2 py-5 flex gap-4 shadow-[0_-4px_24px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          className="flex-[2] py-4 bg-slate-900 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-800 transition-all disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
        >
          {isSaving ? (
            <><Loader2 size={14} className="animate-spin" /> Guardando...</>
          ) : (
            'Guardar Cambios'
          )}
        </button>
      </div>
    </div>
  );
};
