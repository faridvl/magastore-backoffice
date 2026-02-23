import React, { useState } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

const CreateCustomerPage: React.FC = () => {
    // Estado para manejar múltiples direcciones
    const [addresses, setAddresses] = useState([{ id: 1, value: '', label: 'Principal' }]);
    const [selectedTier, setSelectedTier] = useState('Regular');

    const addAddressField = () => {
        setAddresses([...addresses, { id: Date.now(), value: '', label: '' }]);
    };

    const removeAddress = (id: number) => {
        setAddresses(addresses.filter(a => a.id !== id));
    };

    const tiers = [
        { id: 'Regular', label: 'Regular', desc: 'Cliente estándar', color: 'bg-neutral-100 text-neutral-500' },
        { id: 'VIP', label: 'VIP', desc: 'Cliente frecuente', color: 'bg-primary/10 text-primary border-primary/20' },
        { id: 'Diamond', label: 'Diamond', desc: 'Nivel máximo', color: 'bg-blue-600 text-white' }
    ];

    return (
        <>
            <Head><title>Nuevo Cliente | ScentStack</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Crear Nuevo Cliente">
                <div className="max-w-4xl mx-auto">
                    <form className="space-y-10 bg-white p-12 rounded-[40px] border border-neutral-100 shadow-xl shadow-neutral-100/50 mb-20">

                        {/* SECCIÓN 1: DATOS PERSONALES */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="col-span-2 border-b border-neutral-100 pb-4 mb-2">
                                <Typography variant={TypographyVariant.SUBTITLE}>Datos Personales</Typography>
                            </div>
                            <FormInput label="Nombre Completo" placeholder="Ej. Alexander Pierce" />
                            <FormInput label="Cédula / Pasaporte" placeholder="0-000-000" />
                            <FormInput label="Correo Electrónico" placeholder="cliente@email.com" type="email" />
                            <FormInput label="Teléfono / WhatsApp" placeholder="+507 0000-0000" />
                        </div>

                        {/* SECCIÓN 2: TIPO DE CLIENTE (NUEVO) */}
                        <div className="space-y-4">
                            <div className="border-b border-neutral-100 pb-4 mb-2">
                                <Typography variant={TypographyVariant.SUBTITLE}>Nivel de Lealtad</Typography>
                                <Typography variant={TypographyVariant.HELPER}>Selecciona el perfil de beneficios para este cliente.</Typography>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {tiers.map((tier) => (
                                    <div
                                        key={tier.id}
                                        onClick={() => setSelectedTier(tier.id)}
                                        className={`cursor-pointer p-6 rounded-3xl border-2 transition-all flex flex-col gap-1 ${selectedTier === tier.id
                                            ? 'border-primary bg-primary/5 shadow-md scale-[1.02]'
                                            : 'border-neutral-50 bg-neutral-50/50 hover:border-neutral-200'
                                            }`}
                                    >
                                        <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full w-fit ${tier.color}`}>
                                            {tier.label}
                                        </span>
                                        <p className="text-xs font-medium text-neutral-400 mt-2">{tier.desc}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* SECCIÓN 3: DIRECCIONES MÚLTIPLES */}
                        <div className="space-y-6">
                            <div className="flex justify-between items-center border-b border-neutral-100 pb-4">
                                <Typography variant={TypographyVariant.SUBTITLE}>Puntos de Entrega</Typography>
                                <button
                                    type="button"
                                    onClick={addAddressField}
                                    className="text-[10px] font-black text-primary uppercase tracking-widest bg-primary/5 px-6 py-3 rounded-2xl hover:bg-primary/10 transition-all"
                                >
                                    + Añadir Dirección
                                </button>
                            </div>

                            <div className="grid grid-cols-1 gap-6">
                                {addresses.map((addr, index) => (
                                    <div key={addr.id} className="flex gap-4 items-end animate-in fade-in slide-in-from-bottom-2 duration-300">
                                        <div className="flex-1 space-y-2">
                                            <label className="text-[10px] font-black uppercase text-neutral-400 ml-2 tracking-widest">
                                                {index === 0 ? 'Dirección Principal' : `Dirección Adicional #${index}`}
                                            </label>
                                            <div className="relative">
                                                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-lg">📍</span>
                                                <input
                                                    className="w-full bg-neutral-50 border-none rounded-[20px] pl-12 pr-6 py-5 focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-neutral-700 placeholder:text-neutral-300"
                                                    placeholder="Provincia, Ciudad, Edificio, Casa..."
                                                />
                                            </div>
                                        </div>
                                        {index > 0 && (
                                            <button
                                                type="button"
                                                onClick={() => removeAddress(addr.id)}
                                                className="bg-red-50 text-red-400 p-5 rounded-[20px] hover:bg-red-100 transition-colors shadow-sm mb-[2px]"
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ACCIONES */}
                        <div className="flex gap-4 pt-10 border-t border-neutral-50">
                            <button
                                type="button"
                                className="flex-1 py-5 bg-neutral-100 text-neutral-500 rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:bg-neutral-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-[2] py-5 bg-neutral-900 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest hover:shadow-2xl hover:bg-black transition-all shadow-lg shadow-neutral-300"
                            >
                                Guardar Perfil de Cliente
                            </button>
                        </div>
                    </form>
                </div>
            </DashboardLayout>
        </>
    );
};

// Componente Reutilizable Interno
const FormInput = ({ label, placeholder, type = "text" }: any) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black uppercase text-neutral-400 ml-2 tracking-widest">{label}</label>
        <input
            type={type}
            placeholder={placeholder}
            className="w-full bg-neutral-50 border-none rounded-[20px] px-6 py-5 focus:ring-2 focus:ring-primary outline-none transition-all font-medium text-neutral-700 placeholder:text-neutral-300 shadow-sm"
        />
    </div>
);

export default CreateCustomerPage;