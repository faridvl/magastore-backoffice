import React from 'react';
import { Phone, MapPin, Mail, Calendar, Tag, IdCard, CreditCard, Box, TrendingUp, DollarSign, Edit3, Plus, Copy, Check as CheckIcon, Package, Clock, Loader2, MessageCircle } from 'lucide-react';

const MAILBOXES = [
  { label: 'USA Aéreo', suffix: 'A', flag: '🇺🇸', color: 'bg-sky-50 border-sky-100 text-sky-700' },
  { label: 'USA Marítimo', suffix: 'M', flag: '🚢', color: 'bg-blue-50 border-blue-100 text-blue-700' },
  { label: 'China', suffix: 'CH', flag: '🇨🇳', color: 'bg-red-50 border-red-100 text-red-700' },
  { label: 'Colombia', suffix: 'CO', flag: '🇨🇴', color: 'bg-amber-50 border-amber-100 text-amber-700' },
];

function MailboxCard({ code, label, suffix, flag, color }: { code: string; label: string; suffix: string; flag: string; color: string }) {
  const [copied, setCopied] = React.useState(false);
  const mailboxCode = `${code}-${suffix}`;
  const handleCopy = () => {
    navigator.clipboard.writeText(mailboxCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${color}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{flag}</span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{label}</p>
          <p className="text-sm font-mono font-black">{mailboxCode}</p>
        </div>
      </div>
      <button
        onClick={handleCopy}
        title="Copiar casillero"
        className="p-2 rounded-xl hover:bg-white/60 transition-colors"
      >
        {copied ? <CheckIcon size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { useCustomerDetail } from './use-customer-detail';
import { CustomerHistoryTab } from './customer-history-tab';
import { CustomerEditForm } from './customer-edit-form';

export const CustomerDetailContainer: React.FC<{ id: string }> = ({ id }) => {
    const {
        customer,
        isLoading,
        initials,
        metrics,
        seasonalityData,
        activePackages,
        filteredHistory,
        loadingPackages,
        setSearchTerm,
        handleNotifyWhatsApp,
        isNotifying,
        handleBack,
        activeTab,
        setActiveTab,
        isEditMode,
        editForm,
        editError,
        isSaving,
        enterEditMode,
        cancelEdit,
        handleEditField,
        handleEditAddress,
        addNewAddress,
        saveEdit,
    } = useCustomerDetail(id);

    if (isLoading || !customer) return <div>Cargando expediente...</div>;

    const metricPackageCount = metrics != null ? String(metrics.packageCount) : '—';
    const metricTotalLbs = metrics != null ? `${metrics.totalLbs} lb` : '—';
    const metricTotalSpent = metrics != null ? `₡${metrics.totalSpent.toLocaleString()}` : '—';
    const metricCustomerType = metrics != null ? metrics.customerType : '—';
    const metricFirstOrderDate = metrics != null ? metrics.firstOrderDate : '—';

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* LADO IZQUIERDO: Perfil Fijo */}
                <aside className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden lg:sticky lg:top-6">
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

                            {!isEditMode && (
                                <button
                                    onClick={enterEditMode}
                                    className="w-full mt-2 flex items-center justify-center gap-2 py-3 bg-slate-50 hover:bg-primary/5 border border-slate-100 hover:border-primary/20 text-slate-500 hover:text-primary rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <Edit3 size={12} /> Editar cliente
                                </button>
                            )}
                        </div>
                    </div>
                </aside>

                {/* CONTENIDO CENTRAL */}
                <main className="lg:col-span-3 space-y-6">

                    {isEditMode && editForm ? (
                        /* MODO EDICIÓN */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg text-primary">Editar Cliente</Typography>
                            </div>
                            <CustomerEditForm
                                form={editForm}
                                isSaving={isSaving}
                                error={editError}
                                onFieldChange={handleEditField}
                                onAddressChange={handleEditAddress}
                                onAddAddress={addNewAddress}
                                onSave={saveEdit}
                                onCancel={cancelEdit}
                            />
                        </div>
                    ) : (
                        <>
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
                                    {/* Score Cards */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Box size={24} /></div>
                                            <div>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Paquetes</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metricPackageCount}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24} /></div>
                                            <div>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Libras</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metricTotalLbs}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-primary/5 text-primary rounded-2xl"><DollarSign size={24} /></div>
                                            <div>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Inversión</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metricTotalSpent}</Typography>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Direcciones */}
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                            <div className="flex justify-between items-center">
                                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Direcciones</Typography>
                                                <Button variant={ButtonVariant.GHOST} onClick={enterEditMode} className="text-xs text-primary flex items-center gap-1">
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
                                                                <button onClick={enterEditMode} className="text-slate-400 hover:text-primary transition-colors"><Edit3 size={14} /></button>
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

                                        {/* Casilleros */}
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4 md:col-span-2">
                                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Casilleros</Typography>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {MAILBOXES.map((mb) => (
                                                    <MailboxCard
                                                        key={mb.suffix}
                                                        code={customer.customer_code}
                                                        label={mb.label}
                                                        suffix={mb.suffix}
                                                        flag={mb.flag}
                                                        color={mb.color}
                                                    />
                                                ))}
                                            </div>
                                        </div>

                                        {/* Perfil Operativo */}
                                        <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                                            <div className="flex justify-between items-center mb-6">
                                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Perfil Operativo</Typography>
                                                <Button variant={ButtonVariant.GHOST} onClick={enterEditMode} className="text-xs text-primary flex items-center gap-1">
                                                    <Edit3 size={14} /> Gestionar
                                                </Button>
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 flex-1">
                                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-transparent hover:border-slate-100 transition-colors">
                                                    <div className="flex items-center gap-3 text-slate-500"><Tag size={18} /><Typography variant={TypographyVariant.BODY}>Categoría</Typography></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD} textColor="text-primary">{metricCustomerType}</Typography>
                                                </div>
                                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl font-medium">
                                                    <div className="flex items-center gap-3 text-slate-500"><Calendar size={18} /><Typography variant={TypographyVariant.BODY}>Registro</Typography></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>{new Date(customer.created_at).toLocaleDateString()}</Typography>
                                                </div>
                                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                                    <div className="flex items-center gap-3 text-slate-500"><CreditCard size={18} /><Typography variant={TypographyVariant.BODY}>Primer Pedido</Typography></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>{metricFirstOrderDate}</Typography>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* VISTA 2: PAQUETES */
                                <div className="animate-in fade-in slide-in-from-right-4 duration-500 space-y-6">
                                    {loadingPackages ? (
                                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-500" /></div>
                                    ) : (
                                        <>
                                            {/* Paquetes Activos */}
                                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-amber-50 rounded-lg"><Package size={14} className="text-amber-600" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>Paquetes Activos</Typography>
                                                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{activePackages.length}</span>
                                                    <button
                                                        onClick={handleNotifyWhatsApp}
                                                        disabled={isNotifying}
                                                        title="Notifica de sus paquetes sin orden de envío"
                                                        className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50"
                                                    >
                                                        <MessageCircle size={12} />
                                                        {isNotifying ? 'Abriendo...' : 'WhatsApp'}
                                                    </button>
                                                </div>
                                                {activePackages.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-6">Sin paquetes activos</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {activePackages.map((pkg) => (
                                                            <div key={pkg.tracking_number} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <Package size={14} className="text-slate-400" />
                                                                    <div>
                                                                        <p className="text-xs font-mono font-black text-slate-800">{pkg.tracking_number}</p>
                                                                        <p className="text-[10px] text-slate-400">{pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb</p>
                                                                    </div>
                                                                </div>
                                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                                                                    pkg.status === 'PANAMA' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'
                                                                }`}>
                                                                    {pkg.status === 'PANAMA' ? 'Panamá' : 'En Trámite'}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Historial */}
                                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg"><Clock size={14} className="text-slate-500" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>Historial de Paquetes</Typography>
                                                    <span className="ml-auto text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
                                                </div>
                                                <div className="mb-3">
                                                    <input
                                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-amber-200"
                                                        placeholder="Buscar tracking..."
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                {filteredHistory.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-6">Sin paquetes entregados</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {filteredHistory.map((pkg) => (
                                                            <div key={pkg.tracking_number} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <Clock size={14} className="text-slate-400" />
                                                                    <div>
                                                                        <p className="text-xs font-mono font-black text-slate-800">{pkg.tracking_number}</p>
                                                                        <p className="text-[10px] text-slate-400">{pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb</p>
                                                                    </div>
                                                                </div>
                                                                <span className="text-[9px] font-black uppercase px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
                                                                    Entregado
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </main>
            </div>
        </div>
    );
};
