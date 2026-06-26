import React from 'react';
import { Plus, MapPin, Loader2 } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { CustomerUpdateInput, CustomerAddressUpdateInput } from '@/types/customer/customer.types';

interface CustomerEditFormProps {
  form: CustomerUpdateInput;
  isSaving: boolean;
  error: string | null;
  onFieldChange: (field: keyof Omit<CustomerUpdateInput, 'addresses'>, value: string | boolean) => void;
  onAddressChange: (index: number, field: keyof CustomerAddressUpdateInput, value: string | boolean) => void;
  onAddAddress: () => void;
  onSave: () => void;
  onCancel: () => void;
}

const FieldInput = ({ label, value, onChange, type = 'text', disabled = false }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  disabled?: boolean;
}) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black uppercase text-slate-400 ml-1 tracking-widest">{label}</label>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full bg-slate-50 border border-slate-100 rounded-[16px] px-5 py-4 focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
    />
  </div>
);

export const CustomerEditForm: React.FC<CustomerEditFormProps> = ({
  form,
  isSaving,
  error,
  onFieldChange,
  onAddressChange,
  onAddAddress,
  onSave,
  onCancel,
}) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Datos Personales */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
        <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Datos Personales</Typography>

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
          <FieldInput
            label="Correo Electrónico"
            type="email"
            value={form.email}
            onChange={(v) => onFieldChange('email', v)}
          />
          <FieldInput
            label="Teléfono"
            value={form.phone}
            onChange={(v) => onFieldChange('phone', v)}
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
          <Typography variant={TypographyVariant.BODY_SEMIBOLD} className={form.is_active ? 'text-green-600' : 'text-slate-400'}>
            {form.is_active ? 'Activo' : 'Inactivo'}
          </Typography>
        </div>
      </div>

      {/* Direcciones */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
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
              <FieldInput label="Provincia" value={addr.province} onChange={(v) => onAddressChange(index, 'province', v)} />
              <FieldInput label="Cantón" value={addr.canton} onChange={(v) => onAddressChange(index, 'canton', v)} />
              <FieldInput label="Distrito" value={addr.district} onChange={(v) => onAddressChange(index, 'district', v)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FieldInput label="Dirección Exacta" value={addr.exact_address} onChange={(v) => onAddressChange(index, 'exact_address', v)} />
              <FieldInput label="Etiqueta" value={addr.address_label ?? ''} onChange={(v) => onAddressChange(index, 'address_label', v)} />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={addr.is_default ?? false}
                onChange={(e) => onAddressChange(index, 'is_default', e.target.checked)}
                className="h-4 w-4 rounded text-primary accent-primary"
              />
              <Typography variant={TypographyVariant.BODY} className="text-slate-600 text-sm">Marcar como dirección principal</Typography>
            </label>
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
