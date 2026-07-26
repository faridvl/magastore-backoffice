import React from 'react';
import { useRouter } from 'next/router';
import { Phone, MapPin, Mail, Calendar, Tag, IdCard, CreditCard, Box, TrendingUp, DollarSign, Edit3, Plus, Copy, Check as CheckIcon, CheckCircle, Package, Clock, Loader2, MessageCircle, CheckSquare, Square, Boxes, ChevronRight } from 'lucide-react';

// Casillero por ruta (origin + package_type) — solo USA/AEREO tiene datos
// reales hoy (ver warehouse_routes). Rutas futuras se agregan como fila nueva
// en esa tabla, sin tocar este mapa de presentación.
const WAREHOUSE_ROUTE_DISPLAY: Record<string, { label: string; flag: string; color: string }> = {
  'USA-AEREO': { label: 'USA Aéreo', flag: '🇺🇸', color: 'bg-sky-50 border-sky-100 text-sky-700' },
  'USA-MARITIMO': { label: 'USA Marítimo', flag: '🚢', color: 'bg-blue-50 border-blue-100 text-blue-700' },
  'CHINA-MARITIMO': { label: 'China', flag: '🇨🇳', color: 'bg-red-50 border-red-100 text-red-700' },
};

function WarehouseCodeCard({
  code, origin, packageType, addressLine, city, state, postalCode, contactPhone,
  customerFirstName, customerFullName, customerPhone,
}: {
  code: string; origin: string; packageType: string;
  addressLine: string | null; city: string | null; state: string | null;
  postalCode: string | null; contactPhone: string | null;
  customerFirstName: string; customerFullName: string; customerPhone: string;
}) {
  const [copied, setCopied] = React.useState(false);
  const welcomeTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.WAREHOUSE_WELCOME);
  const display = WAREHOUSE_ROUTE_DISPLAY[`${origin}-${packageType}`] ?? {
    label: `${origin} ${packageType}`,
    flag: '📦',
    color: 'bg-slate-50 border-slate-100 text-slate-700',
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const handleSendWelcome = () => {
    if (!customerPhone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    const message = buildWarehouseWelcomeMessage({
      firstName: customerFirstName,
      fullName: customerFullName,
      code,
      routeLabel: display.label,
      addressLine, city, state, postalCode, contactPhone,
      templateBody: welcomeTemplateBody,
    });
    openWhatsApp(customerPhone, message);
  };
  return (
    <div className={`flex items-center justify-between p-4 rounded-2xl border ${display.color}`}>
      <div className="flex items-center gap-3">
        <span className="text-lg">{display.flag}</span>
        <div>
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60">{display.label}</p>
          <p className="text-sm font-mono font-black">{code}</p>
        </div>
      </div>
      {/* Targets de 44px mínimo (guía táctil de iOS/iPad) y etiqueta en el botón
          de WhatsApp — en touch no hay tooltip que explique un ícono solo */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        <button
          onClick={handleSendWelcome}
          title="Enviar datos de casillero por WhatsApp"
          className="flex items-center gap-1.5 min-h-[44px] px-3 rounded-xl hover:bg-white/60 transition-colors text-[10px] font-black uppercase tracking-wide"
        >
          <MessageCircle size={15} />
          <span className="hidden sm:inline">WhatsApp</span>
        </button>
        <button
          onClick={handleCopy}
          title="Copiar casillero"
          className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/60 transition-colors"
        >
          {copied ? <CheckIcon size={15} /> : <Copy size={15} />}
        </button>
      </div>
    </div>
  );
}
import { toast } from 'sonner';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { useCustomerDetail } from './use-customer-detail';
import { CustomerEditForm } from './customer-edit-form';
import { CustomerTypeBadge } from '@/components/common/customer-type-badge/customer-type-badge';
import { openWhatsApp, buildWarehouseWelcomeMessage } from '@/shared/constants/whatsapp-templates';
import { useWhatsAppTemplateBody } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { WHATSAPP_TEMPLATE_CODES } from '@/shared/constants/whatsapp-template-vars';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';

export const CustomerDetailContainer: React.FC<{ id: string }> = ({ id }) => {
    const router = useRouter();
    const {
        customer,
        isLoading,
        initials,
        metrics,
        unassignedPackages,
        assignedPackages,
        filteredHistory,
        loadingPackages,
        setSearchTerm,
        handleNotifyWhatsApp,
        isNotifying,
        selectedPackageUuids,
        handleTogglePackage,
        clearSelection,
        handleCreateOrder,
        isCreatingOrder,
        addressModalTarget,
        setAddressModalTarget,
        selectedAddressId,
        setSelectedAddressId,
        selectedDeliveryMethod,
        setSelectedDeliveryMethod,
        handleConfirmCreateOrderWithAddress,
        handleBack,
        activeTab,
        setActiveTab,
        isEditMode,
        editForm,
        customerTypes,
        editError,
        isSaving,
        enterEditMode,
        cancelEdit,
        handleEditField,
        handleEditAddress,
        addNewAddress,
        saveEdit,
        availableCourierRates,
        isAssignCodeModalOpen,
        openAssignCodeModal,
        closeAssignCodeModal,
        assignWarehouseCode,
        isAssigningCode,
    } = useCustomerDetail(id);

    // Courier elegido en el modal de asignación de casillero.
    const [rateToAssign, setRateToAssign] = React.useState('');
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
    const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);

    if (isLoading || !customer) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-pulse">
                <div className="lg:col-span-1 bg-white rounded-[32px] border border-slate-100 h-80" />
                <div className="lg:col-span-3 space-y-6">
                    <div className="bg-white rounded-[24px] border border-slate-100 h-24" />
                    <div className="bg-white rounded-[32px] border border-slate-100 h-48" />
                    <div className="bg-white rounded-[32px] border border-slate-100 h-48" />
                </div>
            </div>
        );
    }

    const metricPackageCount = metrics != null ? String(metrics.packageCount) : '—';
    const metricTotalLbs = metrics != null ? `${Number(metrics.totalLbs).toFixed(2)} lb` : '—';
    const metricTotalSpent = metrics != null ? `₡${Math.round(metrics.totalSpent).toLocaleString('es-CR')}` : '—';
    const metricFirstPackageDate = metrics != null ? metrics.firstPackageDate : '—';
    const metricLastPackageDate = metrics != null ? metrics.lastPackageDate : '—';

    return (
        <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* LADO IZQUIERDO: Perfil Fijo */}
                <aside className="lg:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden lg:sticky lg:top-6">
                        {/* Compacto en mobile/iPad vertical (fila), columna centrada solo en lg+ —
                            antes el bloque centrado consumía ~400px de alto antes del contenido útil */}
                        <div className="p-5 lg:p-8 flex items-center gap-4 text-left lg:flex-col lg:text-center">
                            <div className="h-14 w-14 lg:h-20 lg:w-20 bg-slate-50 text-primary rounded-[1.25rem] lg:rounded-[1.5rem] flex items-center justify-center lg:mb-6 text-lg lg:text-2xl font-black border-2 border-primary/5 uppercase flex-shrink-0">
                                {initials}
                            </div>

                            <div className="min-w-0 lg:flex lg:flex-col lg:items-center">
                                <div className="space-y-0.5 lg:space-y-1 mb-1.5 lg:mb-4">
                                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-base lg:text-lg leading-tight truncate">
                                        {customer.first_name} {customer.last_name}
                                    </Typography>
                                    <Typography variant={TypographyVariant.CAPTION} className="text-primary font-bold tracking-widest uppercase block">
                                        {customer.customer_code}
                                    </Typography>
                                    {customer.customer_type_name && (
                                        <CustomerTypeBadge
                                            name={customer.customer_type_name}
                                            mode={customer.customer_type_billing_mode}
                                            discount={customer.customer_type_discount_percent}
                                        />
                                    )}
                                </div>

                                <div className="inline-flex items-center gap-2 py-1 px-4 bg-slate-50 rounded-full border border-slate-100">
                                    <Typography variant={TypographyVariant.OVERLINE} className="text-slate-500 font-bold">Estado</Typography>
                                    <span className={`h-2 w-2 rounded-full ${customer.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                    <Typography variant={TypographyVariant.OVERLINE} className="font-black uppercase">
                                        {customer.is_active ? 'Activo' : 'Inactivo'}
                                    </Typography>
                                </div>
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
                                customerTypes={customerTypes}
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
                            <div className="flex gap-4 sm:gap-8 border-b border-slate-100">
                                {['info', 'history'].map((tab) => (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`pb-4 px-2 border-b-2 transition-all font-bold text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
                                            }`}
                                    >
                                        {tab === 'info' ? 'Información' : 'Actividad y Paquetes'}
                                        {tab === 'history' && unassignedPackages.length > 0 && (
                                            <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">
                                                {unassignedPackages.length}
                                            </span>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* VISTA 1: INFORMACIÓN GENERAL (Con Métricas) */}
                            {activeTab === 'info' ? (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {/* Casilleros — lo primero: es el dato que más se copia/comparte */}
                                    <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between gap-3">
                                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Casilleros</Typography>
                                            {availableCourierRates.length > 0 && (
                                                <button
                                                    onClick={() => { setRateToAssign(''); openAssignCodeModal(); }}
                                                    className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white rounded-2xl text-[11px] font-bold hover:bg-amber-700 transition-colors"
                                                >
                                                    <Plus size={14} /> Asignar casillero
                                                </button>
                                            )}
                                        </div>
                                        {customer.warehouse_codes.length === 0 ? (
                                            <p className="text-slate-400 text-sm">Este cliente no tiene casillero asignado.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {customer.warehouse_codes.map((wc) => (
                                                    <WarehouseCodeCard
                                                        key={`${wc.origin}-${wc.package_type}`}
                                                        code={wc.code}
                                                        origin={wc.origin}
                                                        packageType={wc.package_type}
                                                        addressLine={wc.address_line}
                                                        city={wc.city}
                                                        state={wc.state}
                                                        postalCode={wc.postal_code}
                                                        contactPhone={wc.contact_phone}
                                                        customerFirstName={customer.first_name}
                                                        customerFullName={`${customer.first_name} ${customer.last_name}`}
                                                        customerPhone={customer.phone}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Métricas reales (paquetes, peso, facturado) */}
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="bg-white p-5 lg:p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl"><Box size={24} /></div>
                                            <div>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Paquetes</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metricPackageCount}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 lg:p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><TrendingUp size={24} /></div>
                                            <div>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Libras</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metricTotalLbs}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-5 lg:p-6 rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-4">
                                            <div className="p-3 bg-primary/5 text-primary rounded-2xl"><DollarSign size={24} /></div>
                                            <div>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase">Facturado</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black">{metricTotalSpent}</Typography>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Direcciones */}
                                        <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-100 shadow-sm space-y-6">
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
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Typography variant={TypographyVariant.BODY_BOLD}>{addr.address_label}</Typography>
                                                                {addr.is_default && <span className="bg-primary text-white text-[9px] px-2 py-0.5 rounded-full font-black uppercase">Principal</span>}
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

                                        {/* Perfil Operativo — solo datos reales, se edita desde "Editar cliente" */}
                                        <div className="bg-white p-6 lg:p-8 rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
                                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg mb-6">Perfil Operativo</Typography>
                                            <div className="grid grid-cols-1 gap-3 flex-1">
                                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                                    <div className="flex items-center gap-3 text-slate-500"><Calendar size={18} /><Typography variant={TypographyVariant.BODY}>Registro</Typography></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>{new Date(customer.created_at).toLocaleDateString('es-CR')}</Typography>
                                                </div>
                                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                                    <div className="flex items-center gap-3 text-slate-500"><Box size={18} /><Typography variant={TypographyVariant.BODY}>Primer Paquete</Typography></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>{metricFirstPackageDate}</Typography>
                                                </div>
                                                <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                                                    <div className="flex items-center gap-3 text-slate-500"><Clock size={18} /><Typography variant={TypographyVariant.BODY}>Último Paquete</Typography></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>{metricLastPackageDate}</Typography>
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
                                            {/* Paquetes Sin Orden — seleccionables para crear orden de envío */}
                                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-amber-50 rounded-lg"><Package size={14} className="text-amber-600" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>Paquetes Sin Orden</Typography>
                                                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{unassignedPackages.length}</span>
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
                                                {unassignedPackages.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-6">Sin paquetes disponibles</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {unassignedPackages.map((pkg) => {
                                                            const selected = selectedPackageUuids.includes(pkg.uuid);
                                                            return (
                                                                <button
                                                                    key={pkg.uuid}
                                                                    onClick={() => handleTogglePackage(pkg.uuid)}
                                                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-all ${
                                                                        selected ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3">
                                                                        {selected
                                                                            ? <CheckSquare size={16} className="text-amber-600 flex-shrink-0" />
                                                                            : <Square size={16} className="text-slate-300 flex-shrink-0" />
                                                                        }
                                                                        <div>
                                                                            <p className="text-xs font-mono font-black text-slate-800">{pkg.tracking_number}</p>
                                                                            <p className="text-[10px] text-slate-400">{pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb</p>
                                                                        </div>
                                                                    </div>
                                                                    {/* Mismos colores por estado que el listado de Logística */}
                                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full ${
                                                                        pkg.status === 'PANAMA' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'
                                                                    }`}>
                                                                        {pkg.status === 'PANAMA' ? 'En Panamá' : 'En Trámite'}
                                                                    </span>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {selectedPackageUuids.length > 0 && (
                                                    <div className="flex items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                                                        <span className="text-[11px] font-bold text-slate-500">
                                                            {selectedPackageUuids.length} paquete{selectedPackageUuids.length > 1 ? 's' : ''} seleccionado{selectedPackageUuids.length > 1 ? 's' : ''}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={clearSelection}
                                                                className="text-[10px] font-bold uppercase text-slate-400 hover:text-slate-600 px-3 py-2"
                                                            >
                                                                Limpiar
                                                            </button>
                                                            <button
                                                                onClick={handleCreateOrder}
                                                                disabled={isCreatingOrder}
                                                                className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all disabled:opacity-50"
                                                            >
                                                                {isCreatingOrder ? 'Creando...' : 'Crear orden de envío'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Paquetes en órdenes activas — solo lectura, badge a la orden */}
                                            <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-blue-50 rounded-lg"><Boxes size={14} className="text-blue-600" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>En Órdenes Activas</Typography>
                                                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{assignedPackages.length}</span>
                                                </div>
                                                {assignedPackages.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-6">Sin paquetes en órdenes activas</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {assignedPackages.map((pkg) => (
                                                            <div key={pkg.uuid} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3">
                                                                    <Package size={14} className="text-slate-400" />
                                                                    <div>
                                                                        <p className="text-xs font-mono font-black text-slate-800">{pkg.tracking_number}</p>
                                                                        <p className="text-[10px] text-slate-400">{pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => router.push(`/admin/shipment-orders/${pkg.consolidation_uuid}`)}
                                                                    className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors"
                                                                >
                                                                    {pkg.consolidation_status ?? 'Ver orden'}
                                                                    <ChevronRight size={11} />
                                                                </button>
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

            {/* MODAL: ELEGIR DIRECCIÓN DE ENTREGA + MÉTODO DE ENVÍO (siempre, al crear la orden) */}
            {/* Asignar un casillero nuevo a un cliente ya creado. Solo lista
                couriers que todavía no tiene: repetir uno no genera código. */}
            {isAssignCodeModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-[28px] shadow-2xl max-w-md w-full p-7 space-y-5">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Asignar casillero</h3>
                            <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                                Se le genera a {customer.first_name} un código nuevo en el courier que elijas.
                            </p>
                        </div>

                        <div>
                            <label className="text-[10px] font-black uppercase text-slate-400 mb-1 block ml-1 tracking-widest">Courier</label>
                            <select
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none"
                                value={rateToAssign}
                                onChange={(e) => setRateToAssign(e.target.value)}
                            >
                                <option value="">Selecciona un courier...</option>
                                {availableCourierRates.map((r) => (
                                    <option key={r.uuid} value={r.uuid}>
                                        {r.name} — {r.origin} · {r.package_type}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col sm:flex-row gap-2">
                            <button
                                onClick={() => assignWarehouseCode(rateToAssign)}
                                disabled={isAssigningCode || !rateToAssign}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 text-white rounded-2xl text-xs font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
                            >
                                {isAssigningCode ? <><Loader2 size={14} className="animate-spin" /> Asignando...</> : 'Asignar casillero'}
                            </button>
                            <button
                                onClick={closeAssignCodeModal}
                                disabled={isAssigningCode}
                                className="px-4 py-3 border border-slate-200 text-slate-500 rounded-2xl text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {addressModalTarget && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                    onClick={() => setAddressModalTarget(null)}
                >
                    <div
                        className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-slate-100 rounded-xl">
                                <MapPin size={18} className="text-slate-600" />
                            </div>
                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                                ¿A cuál dirección se entrega este envío?
                            </Typography>
                        </div>

                        <div className="space-y-2 mb-6">
                            {addressModalTarget.addresses.map((addr) => (
                                <button
                                    key={addr.id}
                                    onClick={() => setSelectedAddressId(addr.id)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                                        selectedAddressId === addr.id
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <div>
                                        <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Default' : ''}</p>
                                        <p className={`text-[11px] mt-0.5 ${selectedAddressId === addr.id ? 'text-slate-300' : 'text-slate-400'}`}>
                                            {addr.exact_address}, {addr.district}, {addr.canton}, {addr.province}
                                        </p>
                                    </div>
                                    {selectedAddressId === addr.id && (
                                        <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                            Método de envío
                        </p>
                        <div className="space-y-2 mb-6">
                            {activeDeliveryMethods.map((dm) => (
                                <button
                                    key={dm.code}
                                    onClick={() => setSelectedDeliveryMethod(dm.code)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                                        selectedDeliveryMethod === dm.code
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <span className="font-bold text-sm">{dm.name}</span>
                                    {selectedDeliveryMethod === dm.code && (
                                        <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                onClick={() => setAddressModalTarget(null)}
                                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleConfirmCreateOrderWithAddress}
                                disabled={!selectedAddressId || !selectedDeliveryMethod || isCreatingOrder}
                                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
                            >
                                {isCreatingOrder ? 'Creando...' : 'Crear Orden de Envío'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
