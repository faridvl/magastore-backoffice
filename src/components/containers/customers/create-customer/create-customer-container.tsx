import React from 'react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { useCreateCustomer } from './use-create-customer';

const TIERS = [
    { id: 'Regular', label: 'Regular', desc: 'Cliente estándar', color: 'bg-neutral-100 text-neutral-500' },
    { id: 'VIP', label: 'VIP', desc: 'Cliente frecuente', color: 'bg-blue-50 text-blue-600 border-blue-100' },
    { id: 'Diamond', label: 'Diamond', desc: 'Nivel máximo', color: 'bg-blue-600 text-white' }
];

export const CreateCustomerContainer: React.FC = () => {
    const {
        formData, addresses, errors, handleInputChange,
        addAddressField, removeAddress, handleAddressChange, handleSubmit, isPending
    } = useCreateCustomer();

    return (
        <div className="max-w-4xl mx-auto">
            <form onSubmit={handleSubmit} className="space-y-10 bg-white p-6 md:p-12 rounded-[24px] md:rounded-[40px] border border-neutral-100 shadow-xl shadow-neutral-100/50 mb-20">

                {/* SECCIÓN 1: DATOS PERSONALES */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="col-span-2 border-b border-neutral-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Nuevo Cliente</Typography>
                    </div>

                    <FormInput label="Nombre" name="firstName" value={formData.firstName} onChange={handleInputChange} placeholder="Ej. Alexander" error={errors.firstName} />
                    <FormInput label="Apellidos" name="lastName" value={formData.lastName} onChange={handleInputChange} placeholder="Ej. Pierce" error={errors.lastName} />

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-neutral-400 ml-2 tracking-widest">Tipo Identificación</label>
                        <select
                            name="idType"
                            value={formData.idType}
                            onChange={handleInputChange}
                            className="w-full bg-neutral-50 border-none rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-neutral-700 shadow-sm appearance-none text-sm md:text-base"
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
                    <div className="border-b border-neutral-100 pb-4 mb-2">
                        <Typography variant={TypographyVariant.SUBTITLE}>Nivel de Lealtad</Typography>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {TIERS.map((tier) => (
                            <div
                                key={tier.id}
                                onClick={() => handleInputChange({ target: { name: 'tier', value: tier.id } } as any)}
                                className={`cursor-pointer p-6 rounded-3xl border-2 transition-all flex flex-col gap-1 ${formData.tier === tier.id ? 'border-blue-600 bg-blue-50/30 shadow-md scale-[1.02]' : 'border-neutral-50 bg-neutral-50/50 hover:border-neutral-200'}`}
                            >
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${tier.color}`}>{tier.label}</span>
                                <p className="text-xs font-medium text-neutral-400 mt-2">{tier.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* SECCIÓN 3: DIRECCIONES */}
                <div className="space-y-8">
                    <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                        <div>
                            <Typography variant={TypographyVariant.SUBTITLE}>Direcciones de Entrega</Typography>
                            {errors.addresses && (
                                <p className="text-xs text-red-500 font-semibold mt-1">{errors.addresses}</p>
                            )}
                        </div>
                        <button type="button" onClick={addAddressField} className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-6 py-3 rounded-2xl hover:bg-blue-100 transition-all">
                            + Añadir Dirección
                        </button>
                    </div>

                    {addresses.map((addr, index) => (
                        <div key={addr.id} className="p-5 md:p-8 bg-neutral-50/50 rounded-[24px] md:rounded-[32px] border border-neutral-100 relative">
                            <div className="flex justify-between items-center mb-6">
                                <span className="text-[10px] font-black uppercase text-blue-500 tracking-widest bg-white px-4 py-2 rounded-full shadow-sm">
                                    📍 {addr.address_label}
                                </span>
                                {index > 0 && (
                                    <button type="button" onClick={() => removeAddress(addr.id)} className="text-red-400 hover:text-red-600 text-[10px] font-black uppercase tracking-widest">Eliminar</button>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <FormInput label="Provincia" value={addr.province} onChange={(e: any) => handleAddressChange(addr.id, 'province', e.target.value)} placeholder="Ej. San José" />
                                <FormInput label="Cantón" value={addr.canton} onChange={(e: any) => handleAddressChange(addr.id, 'canton', e.target.value)} placeholder="Ej. Escazú" />
                                <FormInput label="Distrito" value={addr.district} onChange={(e: any) => handleAddressChange(addr.id, 'district', e.target.value)} placeholder="Ej. San Rafael" />
                                <div className="md:col-span-2">
                                    <FormInput label="Dirección Exacta" value={addr.exact_address} onChange={(e: any) => handleAddressChange(addr.id, 'exact_address', e.target.value)} placeholder="Detalles de la ubicación..." />
                                </div>
                                <FormInput label="Etiqueta" value={addr.address_label} onChange={(e: any) => handleAddressChange(addr.id, 'address_label', e.target.value)} placeholder="Ej. Casa de mis papás" />
                            </div>
                        </div>
                    ))}
                </div>

                {/* ACCIONES */}
                <div className="flex gap-4 pt-6 md:pt-10 border-t border-neutral-50">
                    <button type="button" className="flex-1 py-4 md:py-5 bg-neutral-100 text-neutral-500 rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-neutral-200 transition-all">Cancelar</button>
                    <button type="submit" disabled={isPending} className="flex-[2] py-4 md:py-5 bg-neutral-900 text-white rounded-[20px] md:rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:shadow-2xl hover:bg-black transition-all shadow-lg shadow-neutral-300 disabled:opacity-60 disabled:cursor-not-allowed">
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
        <label className="text-[10px] font-black uppercase text-neutral-400 ml-2 tracking-widest">{label}</label>
        <input {...props as any} className={`w-full bg-neutral-50 border rounded-[16px] md:rounded-[20px] px-4 py-3.5 md:px-6 md:py-5 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-medium text-neutral-700 placeholder:text-neutral-300 shadow-sm text-sm md:text-base ${error ? 'border-red-300 bg-red-50/30' : 'border-transparent'}`} />
        {error && <p className="text-xs text-red-500 font-semibold ml-2">{error}</p>}
    </div>
);
