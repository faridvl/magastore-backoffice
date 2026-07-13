import React from 'react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { LocationSelectFields } from '@/components/common/location-select-fields/location-select-fields';
import { useCreateCustomer } from './use-create-customer';

const LOCATION_SELECT_CLASSNAME = 'w-full bg-slate-50 border border-transparent rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm text-sm md:text-base disabled:opacity-50 disabled:cursor-not-allowed';
const LOCATION_LABEL_CLASSNAME = 'text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest';

const ADDRESS_LABELS = ['Casa', 'Oficina', 'Casa de familiar', 'Otro'];

const TIERS = [
    { id: 'Regular', label: 'Regular', desc: 'Cliente estándar', color: 'bg-slate-100 text-slate-500' },
    { id: 'VIP', label: 'VIP', desc: 'Cliente frecuente', color: 'bg-amber-50 text-amber-600 border-amber-100' },
    { id: 'Diamond', label: 'Diamond', desc: 'Nivel máximo', color: 'bg-amber-600 text-white' }
];

export const CreateCustomerContainer: React.FC = () => {
    const {
        formData, addresses, errors, handleInputChange,
        addAddressField, removeAddress, handleAddressChange, handleSubmit, isPending
    } = useCreateCustomer();

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-10 bg-white p-4 md:p-12 rounded-[24px] md:rounded-[40px] border border-slate-100 shadow-xl shadow-slate-100/50 mb-20">

                {/* SECCIÓN 1: DATOS PERSONALES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-1 md:col-span-2 border-b border-slate-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Nuevo Cliente</Typography>
                    </div>

                    <FormInput label="Nombre" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Ej. Alexander" error={errors.firstName} />
                    <FormInput label="Apellidos" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Ej. Pierce" error={errors.lastName} />

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Tipo Identificación</label>
                        <select
                            name="idType"
                            value={formData.idType}
                            onChange={handleInputChange}
                            className="w-full bg-slate-50 border-none rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm appearance-none text-sm md:text-base"
                        >
                            <option value="FISICA">Física</option>
                            <option value="JURIDICA">Jurídica</option>
                            <option value="DIMEX">DIMEX</option>
                            <option value="PASAPORTE">Pasaporte</option>
                        </select>
                    </div>

                    <FormInput label="Número de Cédula" name="idCard" value={formData.idCard} onChange={handleInputChange} placeholder="0-0000-0000" error={errors.idCard} />
                    <FormInput label="Correo Electrónico" name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="cliente@email.com" error={errors.email} />
                    <FormInput label="Teléfono" name="phone" value={formData.phone} onChange={handleInputChange} placeholder="+506 0000-0000" error={errors.phone} />
                </div>

                {/* SECCIÓN 2: TIER */}
                <div className="space-y-4">
                    <div className="border-b border-slate-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Nivel de Lealtad</Typography>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {TIERS.map((tier) => (
                            <div
                                key={tier.id}
                                onClick={() => handleInputChange({ target: { name: 'tier', value: tier.id } } as any)}
                                className={`cursor-pointer p-6 rounded-3xl border-2 transition-all flex flex-col gap-1 ${formData.tier === tier.id ? 'border-amber-600 bg-amber-50/30 shadow-md scale-[1.02]' : 'border-slate-50 bg-slate-50/50 hover:border-slate-200'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${tier.color}`}>{tier.label}</span>
                                <p className="text-xs font-medium text-slate-400 mt-2">{tier.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 3: DIRECCIONES */}
                <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <div>
                            <Typography variant={TypographyVariant.SUBTITLE}>Direcciones de Entrega</Typography>
                            {errors.addresses && (
                                <p className="text-xs text-red-500 font-semibold mt-1">{errors.addresses}</p>
                            )}
                        </div>
                        <button type="button" onClick={addAddressField} className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-6 py-3 rounded-2xl hover:bg-amber-100 transition-all">
                            + Añadir Dirección
                        </button>
                    </div>

                    {addresses.map((addr, index) => (
                        <div key={addr.id} className="p-5 md:p-8 bg-slate-50/50 rounded-[24px] md:rounded-[32px] border border-slate-100 relative">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest bg-white px-4 py-2 rounded-full shadow-sm">
                                        📍 {addr.address_label}
                                    </span>
                                    {addr.is_default && (
                                        <span className="text-[10px] font-black uppercase text-white bg-amber-600 px-3 py-1 rounded-full">Principal</span>
                                    )}
                                </div>
                                {index > 0 && (
                                    <button type="button" onClick={() => removeAddress(addr.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">Eliminar</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <LocationSelectFields
                                    province={addr.province}
                                    canton={addr.canton}
                                    district={addr.district}
                                    onChange={(field, value) => handleAddressChange(addr.id, field, value)}
                                    selectClassName={LOCATION_SELECT_CLASSNAME}
                                    labelClassName={LOCATION_LABEL_CLASSNAME}
                                />
                                <div className="col-span-1 md:col-span-2">
                                    <FormInput label="Dirección Exacta" value={addr.exact_address} onChange={(e: any) => handleAddressChange(addr.id, 'exact_address', e.target.value)} placeholder="Detalles de la ubicación..." />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">Etiqueta</label>
                                    <select
                                        value={addr.address_label}
                                        onChange={(e) => handleAddressChange(addr.id, 'address_label', e.target.value)}
                                        className="w-full bg-slate-50 border-transparent border rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 shadow-sm text-sm md:text-base"
                                    >
                                        {ADDRESS_LABELS.map((l) => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="mt-5 flex items-center gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleAddressChange(addr.id, 'is_default', !addr.is_default)}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${addr.is_default ? 'bg-amber-500' : 'bg-slate-300'}`}
                                >
                                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${addr.is_default ? 'translate-x-4' : 'translate-x-1'}`} />
                                </button>
                                <span className="text-xs font-semibold text-slate-500">Marcar como dirección principal</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* ACCIONES */}
                <div className="flex gap-4 pt-6 md:pt-10 border-t border-slate-50">
                    <button type="button" className="flex-1 py-4 md:py-5 bg-slate-100 text-slate-500 rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Cancelar</button>
                    <button type="submit" disabled={isPending} className="flex-[2] py-4 md:py-5 bg-slate-900 text-white rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:shadow-2xl hover:bg-black transition-all shadow-lg shadow-slate-300 disabled:opacity-60 disabled:cursor-not-allowed">
                        {isPending ? 'Guardando...' : 'Registrar Cliente'}
                    </button>
                </div>
            </form>
        </div>
    );
};

interface FormInputProps {
    label: string;
    error?: string;
    [key: string]: unknown;
}

const FormInput = ({ label, error, ...props }: FormInputProps) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-slate-400 ml-2 tracking-widest">{label}</label>
        <input {...props as any} className={`w-full bg-slate-50 border rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-amber-500 outline-none transition-all font-medium text-slate-700 placeholder:text-slate-300 shadow-sm text-sm md:text-base ${error ? 'border-red-300 bg-red-50/30' : 'border-transparent'}`} />
        {error && <p className="text-xs text-red-500 font-semibold ml-2">{error}</p>}
    </div>
);
