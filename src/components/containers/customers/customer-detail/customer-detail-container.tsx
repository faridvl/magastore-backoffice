import React from 'react';
import { useRouter } from 'next/router';
import { Phone, MapPin, Mail, Calendar, Tag, IdCard, CreditCard, Box, TrendingUp, DollarSign, Edit3, Plus, Copy, Check as CheckIcon, CheckCircle, Package, Clock, Loader2, MessageCircle, CheckSquare, Square, Boxes, ChevronRight, Trash2, X } from 'lucide-react';

// Etiquetas legibles del tipo de identificación — el enum se guarda en
// mayúsculas sin acentos y no es lo que el operador debería leer en la ficha.
const ID_TYPE_LABELS: Record<string, string> = {
  FISICA: 'Cédula física',
  JURIDICA: 'Cédula jurídica',
  DIMEX: 'DIMEX',
  PASAPORTE: 'Pasaporte',
};

// Mismas etiquetas y colores por estado que el listado de Logística, para que
// un paquete se lea igual en las dos pantallas.
const PACKAGE_STATUS_LABELS: Record<string, string> = {
  PANAMA: 'En Panamá',
  EN_TRAMITE: 'En Trámite',
  ENTREGADO: 'Entregado',
};

const PACKAGE_STATUS_STYLES: Record<string, string> = {
  PANAMA: 'bg-amber-50 text-amber-600',
  EN_TRAMITE: 'bg-blue-50 text-blue-600',
  ENTREGADO: 'bg-emerald-50 text-emerald-700',
};

// Casillero por ruta (origin + package_type) — solo USA/AEREO tiene datos
// reales hoy (ver warehouse_routes). Rutas futuras se agregan como fila nueva
// en esa tabla, sin tocar este mapa de presentación.
const WAREHOUSE_ROUTE_DISPLAY: Record<string, { label: string; flag: string; color: string }> = {
  'USA-AEREO': { label: 'USA Aéreo', flag: '🇺🇸', color: 'bg-sky-50 border-sky-100 text-sky-700' },
  'USA-MARITIMO': { label: 'USA Marítimo', flag: '🚢', color: 'bg-blue-50 border-blue-100 text-blue-700' },
  'CHINA-MARITIMO': { label: 'China', flag: '🇨🇳', color: 'bg-red-50 border-red-100 text-red-700' },
};

function WarehouseCodeCard({
  code, courierName, origin, packageType, addressLine, city, state, postalCode, contactPhone,
  customerFirstName, customerFullName, customerPhone,
  onRemove, isRemoving, canRemove,
}: {
  code: string; courierName: string; origin: string; packageType: string;
  addressLine: string | null; city: string | null; state: string | null;
  postalCode: string | null; contactPhone: string | null;
  customerFirstName: string; customerFullName: string; customerPhone: string;
  onRemove: () => void; isRemoving: boolean; canRemove: boolean;
}) {
  const [copied, setCopied] = React.useState(false);
  const [confirmRemove, setConfirmRemove] = React.useState(false);
  const welcomeTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.WAREHOUSE_WELCOME);
  // El courier manda en la etiqueta: dos proveedores pueden ser USA/AEREO y el
  // operador los distingue por nombre, no por la ruta. El mapa de origen+tipo
  // solo aporta bandera y color.
  const routeStyle = WAREHOUSE_ROUTE_DISPLAY[`${origin}-${packageType}`] ?? {
    label: `${origin} ${packageType}`,
    flag: '📦',
    color: 'bg-slate-50 border-slate-100 text-slate-700',
  };
  const display = { ...routeStyle, label: courierName || routeStyle.label };
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
    void notifyWhatsApp(customerPhone, message);
  };
  return (
    <div className={`flex items-center justify-between gap-2 p-4 rounded-2xl border ${display.color}`}>
      {/* min-w-0 en el flex padre: sin él el código largo empuja los botones
          fuera de la tarjeta en vez de cortarse. */}
      <div className="flex items-center gap-3 min-w-0">
        <span className="text-lg flex-shrink-0">{display.flag}</span>
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-widest opacity-60 truncate">
            {display.label} · {origin} {packageType}
          </p>
          <p className="text-sm font-mono font-black truncate">{code}</p>
        </div>
      </div>
      {/* Targets de 44px mínimo (guía táctil de iOS/iPad) y etiqueta en el botón
          de WhatsApp — en touch no hay tooltip que explique un ícono solo */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {confirmRemove ? (
          <>
            <button
              onClick={onRemove}
              disabled={isRemoving}
              className="flex items-center justify-center min-h-[44px] px-3 rounded-xl bg-red-500 text-white text-[10px] font-black uppercase tracking-wide hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {isRemoving ? <Loader2 size={14} className="animate-spin" /> : 'Quitar'}
            </button>
            <button
              onClick={() => setConfirmRemove(false)}
              disabled={isRemoving}
              className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/60 transition-colors disabled:opacity-50"
              title="Cancelar"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <>
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
            {/* Solo quita la asignación de ESTE cliente: el casillero del
                proveedor sigue existiendo para los demás. */}
            {canRemove && (
              <button
                onClick={() => setConfirmRemove(true)}
                title="Quitarle este casillero al cliente"
                className="flex items-center justify-center min-h-[44px] min-w-[44px] rounded-xl hover:bg-white/60 hover:text-red-500 transition-colors"
              >
                <Trash2 size={15} />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
import { toast } from 'sonner';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { useCustomerDetail } from './use-customer-detail';
import { CustomerEditForm } from './customer-edit-form';
import { CustomerAddressesModal } from './customer-addresses-modal';
import { CustomerTypeBadge } from '@/components/common/customer-type-badge/customer-type-badge';
import { notifyWhatsApp, buildWarehouseWelcomeMessage } from '@/shared/constants/whatsapp-templates';
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
        searchTerm,
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
        couriersWithoutWarehouse,
        isAssignCodeModalOpen,
        openAssignCodeModal,
        closeAssignCodeModal,
        assignWarehouseCode,
        isAssigningCode,
        removeWarehouseCode,
        removingRouteId,
    } = useCustomerDetail(id);

    // Courier elegido en el modal de asignación de casillero.
    const [rateToAssign, setRateToAssign] = React.useState('');
    const [isAddressesModalOpen, setIsAddressesModalOpen] = React.useState(false);
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
    const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);

    if (isLoading || !customer) {
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8 animate-pulse">
                <div className="md:col-span-1 bg-white rounded-[32px] border border-slate-100 h-80" />
                <div className="md:col-span-2 lg:col-span-3 space-y-6">
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
            {/* iPad vertical (768–1023px) entra en md: con 3 columnas el perfil deja de
                ocupar el ancho completo y el contenido sube sobre el pliegue. */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-5 md:gap-6 lg:gap-8">
                {/* LADO IZQUIERDO: Perfil Fijo */}
                <aside className="md:col-span-1 space-y-6">
                    <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden md:sticky md:top-6">
                        {/* Fila compacta en mobile; columna centrada desde md, donde el aside
                            ya es una columna angosta. Antes el bloque centrado consumía
                            ~400px de alto antes del contenido útil. */}
                        <div className="p-5 md:p-6 lg:p-8 flex items-center gap-4 text-left md:flex-col md:text-center">
                            <div className="h-14 w-14 md:h-16 md:w-16 lg:h-20 lg:w-20 bg-slate-50 text-primary rounded-[1.25rem] lg:rounded-[1.5rem] flex items-center justify-center md:mb-4 lg:mb-6 text-lg lg:text-2xl font-black border-2 border-primary/5 uppercase flex-shrink-0">
                                {initials}
                            </div>

                            <div className="min-w-0 md:flex md:flex-col md:items-center">
                                <div className="space-y-0.5 lg:space-y-1 mb-1.5 md:mb-4">
                                    {/* break-words, no truncate: un nombre largo debe leerse
                                        completo en la columna angosta de iPad. */}
                                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-base lg:text-lg leading-tight break-words">
                                        {customer.first_name} {customer.last_name}
                                    </Typography>
                                    <Typography variant={TypographyVariant.CAPTION} className="text-primary font-bold tracking-widest uppercase block font-mono break-all">
                                        {customer.customer_code}
                                    </Typography>
                                    {customer.customer_type_name ? (
                                        <CustomerTypeBadge
                                            name={customer.customer_type_name}
                                            mode={customer.customer_type_billing_mode}
                                            discount={customer.customer_type_discount_percent}
                                        />
                                    ) : (
                                        // Sin tipo asignado el cobro cae en precio de lista sin
                                        // que nada lo indique — se hace visible para poder corregirlo.
                                        <span className="inline-block text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-slate-100 text-slate-400">
                                            Sin tipo asignado
                                        </span>
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

                        <div className="px-5 md:px-6 lg:px-8 pb-6 lg:pb-8 space-y-4 border-t border-slate-50 pt-6">
                            <div className="flex flex-col gap-1">
                                <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-bold tracking-tighter">Identificación</Typography>
                                <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="flex items-center gap-2 min-w-0">
                                    <IdCard size={14} className="text-slate-300 flex-shrink-0" />
                                    <span className="break-all">{customer.id_card}</span>
                                </Typography>
                                {/* El tipo de identificación se podía editar pero no se mostraba
                                    en ninguna parte de la ficha. */}
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 px-2 py-0.5 rounded-md w-fit">
                                    {ID_TYPE_LABELS[customer.id_type] ?? customer.id_type}
                                </span>
                            </div>

                            <div className="flex flex-col gap-1">
                                <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-bold tracking-tighter">Contacto</Typography>
                                <div className="space-y-2 min-w-0">
                                    <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="flex items-center gap-2">
                                        <Phone size={14} className="text-slate-300 flex-shrink-0" /> {customer.phone}
                                    </Typography>
                                    {/* break-all: un correo largo desbordaba la columna angosta
                                        en vez de cortarse (truncate no aplica sin min-w-0). */}
                                    <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="flex items-start gap-2 text-xs min-w-0">
                                        <Mail size={14} className="text-slate-300 flex-shrink-0 mt-0.5" />
                                        <span className="break-all">{customer.email}</span>
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
                <main className="md:col-span-2 lg:col-span-3 space-y-6 min-w-0">

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
                                        className={`pb-4 px-2 min-h-[44px] border-b-2 transition-all font-bold text-xs sm:text-sm uppercase tracking-widest flex items-center gap-2 ${activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-slate-400 hover:text-slate-600'
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
                                    <div className="bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Casilleros</Typography>
                                            {/* Siempre visible: antes desaparecía sin explicación cuando
                                                no quedaban couriers por asignar, y parecía que la función
                                                no existía. */}
                                            <button
                                                onClick={() => { setRateToAssign(''); openAssignCodeModal(); }}
                                                disabled={availableCourierRates.length === 0}
                                                title={
                                                    availableCourierRates.length === 0
                                                        ? 'Este cliente ya tiene casillero en todos los couriers disponibles'
                                                        : 'Asignarle un casillero en otro courier'
                                                }
                                                className="flex items-center gap-1.5 px-4 min-h-[44px] bg-amber-600 text-white rounded-2xl text-[11px] font-bold hover:bg-amber-700 transition-colors disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed"
                                            >
                                                <Plus size={14} /> Asignar casillero
                                            </button>
                                        </div>
                                        {/* Dos motivos distintos por los que no hay nada que asignar:
                                            el cliente ya los tiene todos, o hay couriers que ni
                                            siquiera tienen casillero configurado (eso se arregla en
                                            Couriers, no aquí). Antes se mostraban juntos en una sola
                                            frase y parecía una contradicción. */}
                                        {availableCourierRates.length === 0 && customer.warehouse_codes.length > 0 && (
                                            <p className="text-[11px] font-medium text-slate-400">
                                                Ya tiene casillero en todos los couriers configurados.
                                            </p>
                                        )}
                                        {couriersWithoutWarehouse.length > 0 && (
                                            <p className="text-[11px] font-medium text-amber-600">
                                                {couriersWithoutWarehouse.join(', ')} {couriersWithoutWarehouse.length === 1 ? 'no tiene' : 'no tienen'} casillero configurado.{' '}
                                                <button
                                                    onClick={() => router.push('/admin/courier-rates')}
                                                    className="underline font-bold hover:text-amber-700"
                                                >
                                                    Configurarlo en Couriers
                                                </button>
                                            </p>
                                        )}
                                        {customer.warehouse_codes.length === 0 ? (
                                            <p className="text-slate-400 text-sm">Este cliente no tiene casillero asignado.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {customer.warehouse_codes.map((wc) => (
                                                    <WarehouseCodeCard
                                                        key={wc.warehouse_route_id}
                                                        code={wc.code}
                                                        courierName={wc.courier_name}
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
                                                        onRemove={() => removeWarehouseCode(wc.warehouse_route_id)}
                                                        isRemoving={removingRouteId === wc.warehouse_route_id}
                                                        // El último no se puede quitar: sin casillero el cliente
                                                        // no puede recibir paquetes de ningún courier.
                                                        canRemove={customer.warehouse_codes.length > 1}
                                                    />
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Métricas reales (paquetes, peso, facturado).
                                        3 columnas desde sm: en iPad la columna central ya es
                                        angosta y apilarlas empujaba el resto fuera de pantalla.
                                        Los iconos se ocultan bajo lg para dejarle el ancho al dato. */}
                                    <div className="grid grid-cols-3 gap-2.5 lg:gap-4">
                                        <div className="bg-white p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3 lg:gap-4 min-w-0">
                                            <div className="hidden lg:block p-3 bg-amber-50 text-amber-600 rounded-2xl flex-shrink-0"><Box size={24} /></div>
                                            <div className="min-w-0">
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase truncate">Paquetes</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black truncate">{metricPackageCount}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3 lg:gap-4 min-w-0">
                                            <div className="hidden lg:block p-3 bg-emerald-50 text-emerald-600 rounded-2xl flex-shrink-0"><TrendingUp size={24} /></div>
                                            <div className="min-w-0">
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase truncate">Libras</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black truncate">{metricTotalLbs}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 lg:p-6 rounded-[20px] lg:rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3 lg:gap-4 min-w-0">
                                            <div className="hidden lg:block p-3 bg-primary/5 text-primary rounded-2xl flex-shrink-0"><DollarSign size={24} /></div>
                                            <div className="min-w-0">
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-bold uppercase truncate">Facturado</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black truncate">{metricTotalSpent}</Typography>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dos columnas solo desde lg: en iPad esta zona vive dentro
                                        de la columna central y partirla en dos deja las
                                        direcciones ilegibles. */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-6">
                                        {/* Direcciones */}
                                        <div className="bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-100 shadow-sm space-y-6">
                                            <div className="flex justify-between items-center gap-3">
                                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Direcciones</Typography>
                                                {/* Abre el modal dedicado en vez del formulario completo
                                                    del cliente: agregar una dirección no debería obligar a
                                                    reenviar nombre, correo y tipo de cliente. */}
                                                <button
                                                    onClick={() => setIsAddressesModalOpen(true)}
                                                    className="flex items-center gap-1 px-3 min-h-[44px] text-xs font-bold text-primary hover:bg-primary/5 rounded-2xl transition-colors flex-shrink-0"
                                                >
                                                    <Plus size={14} /> Gestionar
                                                </button>
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
                                        <div className="bg-white p-5 lg:p-8 rounded-[24px] lg:rounded-[32px] border border-slate-100 shadow-sm flex flex-col">
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
                                            <div className="bg-white p-5 lg:p-6 rounded-[24px] lg:rounded-[2rem] border border-slate-100 shadow-sm">
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
                                                                    className={`w-full flex items-center justify-between gap-3 p-4 rounded-2xl border text-left transition-all ${
                                                                        selected ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        {selected
                                                                            ? <CheckSquare size={16} className="text-amber-600 flex-shrink-0" />
                                                                            : <Square size={16} className="text-slate-300 flex-shrink-0" />
                                                                        }
                                                                        <div className="min-w-0">
                                                                            <p className="text-xs font-mono font-black text-slate-800 truncate">{pkg.tracking_number}</p>
                                                                            <p className="text-[10px] text-slate-400 truncate">{pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb</p>
                                                                        </div>
                                                                    </div>
                                                                    {/* Mismos colores por estado que el listado de Logística */}
                                                                    <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
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
                                            <div className="bg-white p-5 lg:p-6 rounded-[24px] lg:rounded-[2rem] border border-slate-100 shadow-sm">
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
                                                            <div key={pkg.uuid} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <Package size={14} className="text-slate-400 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-mono font-black text-slate-800 truncate">{pkg.tracking_number}</p>
                                                                        <p className="text-[10px] text-slate-400 truncate">{pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => router.push(`/admin/shipment-orders/${pkg.consolidation_uuid}`)}
                                                                    className="flex items-center gap-1 text-[9px] font-black uppercase px-2 py-1 rounded-full bg-white text-blue-700 border border-blue-200 hover:bg-blue-50 transition-colors flex-shrink-0 whitespace-nowrap"
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
                                            <div className="bg-white p-5 lg:p-6 rounded-[24px] lg:rounded-[2rem] border border-slate-100 shadow-sm">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg"><Clock size={14} className="text-slate-500" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>Historial de Paquetes</Typography>
                                                    <span className="ml-auto text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
                                                </div>
                                                <p className="text-[11px] font-medium text-slate-400 mb-3">
                                                    Todos los paquetes del cliente, en cualquier estado.
                                                </p>
                                                <div className="mb-3">
                                                    <input
                                                        className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:border-amber-200"
                                                        placeholder="Buscar por tracking o courier..."
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                {filteredHistory.length === 0 ? (
                                                    <p className="text-sm text-slate-400 text-center py-6">
                                                        {searchTerm ? 'Ningún paquete coincide con la búsqueda' : 'Este cliente aún no tiene paquetes'}
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {filteredHistory.map((pkg) => (
                                                            <div key={pkg.uuid} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <Clock size={14} className="text-slate-400 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-xs font-mono font-black text-slate-800 truncate">{pkg.tracking_number}</p>
                                                                        <p className="text-[10px] text-slate-400 truncate">
                                                                            {pkg.courier_rate_name ?? '—'} · {Number(pkg.weight_lb).toFixed(1)} lb
                                                                            {pkg.consolidation_uuid ? ' · en orden' : ''}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {/* El estado real de cada paquete: el historial ya no
                                                                    asume que todo lo listado está entregado. */}
                                                                <span className={`text-[9px] font-black uppercase px-2 py-1 rounded-full flex-shrink-0 whitespace-nowrap ${
                                                                    PACKAGE_STATUS_STYLES[pkg.status] ?? 'bg-slate-100 text-slate-500'
                                                                }`}>
                                                                    {PACKAGE_STATUS_LABELS[pkg.status] ?? pkg.status}
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

            {isAddressesModalOpen && (
                <CustomerAddressesModal
                    customerId={customer.id}
                    addresses={customer.addresses}
                    onClose={() => setIsAddressesModalOpen(false)}
                />
            )}

            {/* Asignar un casillero nuevo a un cliente ya creado. Solo lista
                couriers cuya ruta el cliente todavía no tiene: repetir una no
                genera código nuevo. */}
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
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-amber-500 transition-all"
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

                            {/* Preview del código que se va a emitir: el operador lo suele
                                copiar al cliente apenas se genera. */}
                            {(() => {
                                const rate = availableCourierRates.find((r) => r.uuid === rateToAssign);
                                if (!rate?.code_prefix) return null;
                                const nextCode = `${rate.code_prefix}${String((rate.current_counter ?? 0) + 1).padStart(2, '0')}`;
                                return (
                                    <p className="text-[11px] text-slate-400 mt-2 ml-1">
                                        Se le asignará el código <span className="font-mono font-bold text-slate-600">{nextCode}</span>
                                    </p>
                                );
                            })()}
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
