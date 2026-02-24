import React from 'react';
import { Phone, MapPin, Mail, ChevronLeft, Calendar, Tag, IdCard, CreditCard, Box, TrendingUp, DollarSign, Edit3, Plus } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { useCustomerDetail } from './use-customer-detail';
import { CustomerHistoryTab } from './customer-history-tab';

export const CustomerDetailContainer: React.FC<{ id: string }> = ({ id }) => {
    const {
        customer,
        isLoading,
        initials,
        metrics,
        seasonalityData,
        filteredHistory,
        setSearchTerm,
        handleBack,
        activeTab,
        setActiveTab
    } = useCustomerDetail(id);

    if (isLoading || !customer) return <div>Cargando expediente...</div>;

    return (
        <div className="flex flex-col gap-6">


            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* LADO IZQUIERDO: Perfil Fijo */}
                <aside className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden sticky top-6">
                        <div className="p-8 flex flex-col items-center text-center">
                            <div className="h-20 w-20 bg-slate-50 text-primary rounded-[1.5rem] flex items-center justify-center mb-6 text-2xl font-black border-2 border-primary/5 uppercase">
                                {initials}
                            </div>

                            <div className="space-y-1 mb-4">
                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg leading-tight">
                                    {customer.first_name} {customer.last_name}
                                </Typography>
                                <Typography variant={TypographyVariant.CAPTION} className="text-primary font-bold tracking-widest uppercase block">
                                    {customer.customer_code}
                                </Typography>
                            </div>

                            <div className="flex items-center gap-2 py-1 px-4 bg-slate-50 rounded-full border border-slate-100">
                                <Typography variant={TypographyVariant.OVERLINE} className="text-slate-500 font-bold">Estado</Typography>
                                <span className={`h-2 w-2 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                <Typography variant={TypographyVariant.OVERLINE} className="font-black uppercase">
                                    {customer.is_active ? 'Activo' : 'Inactivo'}
                                </Typography>
                            </div>
                        </div>

                        <div className="px-8 pb-8 space-y-4 border-t border-slate-50 pt-6">
                            <div className="flex flex-col gap-1">
                                <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-bold tracking-tighter">Identificación</Typography>
                                <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="flex items-center gap-2">
                                    <IdCard size={14} className="text-slate-300" /> {customer.id_card}
                                </Typography>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-bold tracking-tighter">Contacto</Typography>
                                <div className="space-y-2">
                                    <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="flex items-center gap-2">
                                        <Phone size={14} className="text-slate-300" /> {customer.phone}
                                    </Typography>
                                    <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="flex items-center gap-2 truncate text-xs">
                                        <Mail size={14} className="text-slate-300" /> {customer.email}
                                    </Typography>
                                </div>
                            </div>
                        </div>
                    </div>
                </aside>

                {/* CONTENIDO CENTRAL */}
                <main className="lg:col-span-3 space-y-6">

                    {/* Tabs de Navegación */}
                    <div className="flex gap-8 border-b border-slate-100">
                        {['info', 'history'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={`pb-4 px-2 border-b-2 transition-all font-bold text-sm uppercase tracking-widest ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                            >
                                {tab === 'info' ? 'Información' : 'Actividad y Paquetes'}
                            </button>
                        ))}
                    </div>

                    {/* VISTA 1: INFORMACIÓN GENERAL (Con Métricas) */}
                    {activeTab === 'info' ? (
                        <div className="space-y-6 animate-in fade-in duration-500">
                            {/* Score Cards - Solo se ven en "Información" */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Box size={24} /></div>
                                    <div>
                                        <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Paquetes</Typography>
                                        <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metrics.packageCount}</Typography>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24} /></div>
                                    <div>
                                        <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Libras</Typography>
                                        <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metrics.totalLbs} lb</Typography>
                                    </div>
                                </div>
                                <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                    <div className="p-3 bg-primary/5 text-primary rounded-2xl"><DollarSign size={24} /></div>
                                    <div>
                                        <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Inversión</Typography>
                                        <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">₡{metrics.totalSpent.toLocaleString()}</Typography>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Direcciones */}
                                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                    <div className="flex justify-between items-center">
                                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Direcciones</Typography>
                                        <Button variant={ButtonVariant.GHOST} className="text-xs text-primary flex items-center gap-1">
                                            <Plus size={14} /> Agregar
                                        </Button>
                                    </div>
                                    <div className="space-y-4">
                                        {customer.addresses.map((addr) => (
                                            <div key={addr.id} className="p-5 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex gap-4">
                                                <div className="p-2 bg-white rounded-xl h-fit text-primary shadow-sm border border-slate-100"><MapPin size={20} /></div>
                                                <div className="flex-1">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <div className="flex items-center gap-2">
                                                            <Typography variant={TypographyVariant.BODY_BOLD}>{addr.address_label}</Typography>
                                                            {addr.is_default && <span className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Principal</span>}
                                                        </div>
                                                        <button className="text-slate-400 hover:text-primary transition-colors"><Edit3 size={14} /></button>
                                                    </div>
                                                    <Typography variant={TypographyVariant.CAPTION} className="text-slate-500 font-medium">
                                                        {addr.province}, {addr.canton}, {addr.district} <br />
                                                        {addr.exact_address}
                                                    </Typography>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Perfil Operativo */}
                                <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                                    <div className="flex justify-between items-center mb-6">
                                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Perfil Operativo</Typography>
                                        <Button variant={ButtonVariant.GHOST} className="text-xs text-primary flex items-center gap-1">
                                            <Edit3 size={14} /> Gestionar
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 gap-3 flex-1">
                                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-colors">
                                            <div className="flex items-center gap-3 text-slate-500"><Tag size={18} /><Typography variant={TypographyVariant.BODY}>Categoría</Typography></div>
                                            <Typography variant={TypographyVariant.BODY_BOLD} textColor="text-primary">{metrics.customerType}</Typography>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl font-medium">
                                            <div className="flex items-center gap-3 text-slate-500"><Calendar size={18} /><Typography variant={TypographyVariant.BODY}>Registro</Typography></div>
                                            <Typography variant={TypographyVariant.BODY_BOLD}>{new Date(customer.created_at).toLocaleDateString()}</Typography>
                                        </div>
                                        <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                            <div className="flex items-center gap-3 text-slate-500"><CreditCard size={18} /><Typography variant={TypographyVariant.BODY}>Primer Pedido</Typography></div>
                                            <Typography variant={TypographyVariant.BODY_BOLD}>{metrics.firstOrderDate}</Typography>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* VISTA 2: HISTORIAL (Ocupa todo el alto disponible) */
                        <div className="animate-in fade-in slide-in-from-right-4 duration-500 min-h-[600px]">
                            <CustomerHistoryTab
                                seasonalityData={seasonalityData}
                                filteredHistory={filteredHistory}
                                setSearchTerm={setSearchTerm}
                            />
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
};