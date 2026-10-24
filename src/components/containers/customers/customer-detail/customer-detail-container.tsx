import React from 'react';
import { useRouter } from 'next/router';
import {
    Phone, MapPin, Mail, IdCard, Box, TrendingUp, DollarSign, Edit3, Plus, Copy,
    Check as CheckIcon, CheckCircle, Package, Clock, Loader2, MessageCircle, CheckSquare, Square,
    Boxes, ChevronRight, Plane, Ship,
} from 'lucide-react';
import { toast } from 'sonner';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { Badge } from '@/components/common/badge/badge';
import { Modal } from '@/components/common/modal/modal';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { CustomerTypeBadge } from '@/components/common/customer-type-badge/customer-type-badge';
import { useCustomerDetail } from './use-customer-detail';
import { CustomerEditForm } from './customer-edit-form';
import { CustomerAddressesModal } from './customer-addresses-modal';
import { CustomerRecipientsList } from '../customer-recipients/customer-recipients-list';
import { notifyWhatsApp, buildWarehouseWelcomeMessage } from '@/shared/constants/whatsapp-templates';
import { useWhatsAppTemplateBody } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { WHATSAPP_TEMPLATE_CODES } from '@/shared/constants/whatsapp-template-vars';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { BadgeTone, packageStatusLabel, packageStatusTone } from '@/shared/constants/status-labels';
import { packageTypeLabel } from '@/shared/constants/package-labels';
import { formatCrc } from '@/shared/utils/format-crc';
import { applyPhoneMask, idDocumentLabel } from '@/shared/utils/customer-masks';
import { formatBusinessDate } from '@/shared/utils/timezone';
import { formatWeight, formatCount } from '@/shared/utils/format';

const EMPTY_DATE = '—';
const PRINCIPAL_ADDRESS_LABEL = 'principal';

type DetailTab = 'info' | 'history';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
    { key: 'info', label: 'Información' },
    { key: 'history', label: 'Actividad' },
];

const CARD_CLASSNAME = 'bg-white p-5 xl:p-8 rounded-[24px] xl:rounded-[32px] border border-slate-100 shadow-sm';
const ACTIVITY_CARD_CLASSNAME = 'bg-white p-5 xl:p-6 rounded-[24px] xl:rounded-[2rem] border border-slate-100 shadow-sm';
const DARK_BUTTON_CLASSNAME = 'flex items-center justify-center gap-2 min-h-[44px] px-5 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-all disabled:opacity-50';
const TEXT_BUTTON_CLASSNAME = 'flex items-center justify-center min-h-[44px] px-4 rounded-xl text-sm font-semibold text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors';
const SELECT_CLASSNAME = 'w-full min-h-[44px] px-4 bg-slate-50 border border-slate-100 rounded-2xl text-base font-medium outline-none focus:ring-2 focus:ring-amber-500 transition-all';

// Etiqueta por ruta (origin + package_type) para la tarjeta del casillero. `neutralLabel`
// es lo que recibe el cliente en su bienvenida: nunca lleva el nombre del courier.
const WAREHOUSE_ROUTE_DISPLAY: Record<string, { routeLabel: string; neutralLabel: string }> = {
    'USA-AEREO': { routeLabel: 'USA · Aéreo', neutralLabel: 'Estados Unidos · Aéreo' },
    'USA-MARITIMO': { routeLabel: 'USA · Marítimo', neutralLabel: 'Estados Unidos · Marítimo' },
    'CHINA-MARITIMO': { routeLabel: 'China · Marítimo', neutralLabel: 'China · Marítimo' },
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
    onRemove: () => Promise<boolean>; isRemoving: boolean; canRemove: boolean;
}) {
    const [copied, setCopied] = React.useState(false);
    const [confirmRemove, setConfirmRemove] = React.useState(false);
    const welcomeTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.WAREHOUSE_WELCOME);
    // El courier manda en el título: dos proveedores pueden ser USA/AEREO y el
    // operador los distingue por nombre, no por la ruta.
    const routeDisplay = WAREHOUSE_ROUTE_DISPLAY[`${origin}-${packageType}`] ?? {
        routeLabel: `${origin} · ${packageTypeLabel(packageType)}`,
        neutralLabel: packageTypeLabel(packageType),
    };
    const RouteIcon = packageType === 'MARITIMO' ? Ship : Plane;
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
            // Lo que recibe el cliente lleva la ruta neutra, nunca el nombre del courier.
            routeLabel: routeDisplay.neutralLabel,
            addressLine, city, state, postalCode, contactPhone,
            templateBody: welcomeTemplateBody,
        });
        void notifyWhatsApp(customerPhone, message);
    };
    const handleConfirmRemove = async () => {
        // Si falla, el modal queda abierto: el toast del hook explica el motivo.
        const wasRemoved = await onRemove();
        if (wasRemoved) setConfirmRemove(false);
    };
    return (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 space-y-3 min-w-0">
            <div className="flex items-start gap-2 min-w-0">
                <RouteIcon size={18} className="flex-shrink-0 mt-0.5 text-slate-500" aria-hidden />
                <p className="min-w-0 text-sm break-words">
                    <span className="font-bold text-slate-800">{courierName || routeDisplay.routeLabel}</span>
                    <span className="text-slate-500"> · {routeDisplay.routeLabel}</span>
                </p>
            </div>
            <p className="font-mono text-xl font-black break-all text-slate-900">{code}</p>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
                <Button variant={ButtonVariant.SUCCESS} onClick={handleSendWelcome} className="px-4">
                    <MessageCircle size={16} /> Enviar por WhatsApp
                </Button>
                <Button variant={ButtonVariant.CANCEL} onClick={handleCopy} className="px-4">
                    {copied ? <CheckIcon size={16} /> : <Copy size={16} />}
                    {copied ? 'Copiado' : 'Copiar código'}
                </Button>
                {/* Solo quita la asignación de ESTE cliente: el casillero del
                    proveedor sigue existiendo para los demás. */}
                {canRemove && (
                    <button
                        type="button"
                        onClick={() => setConfirmRemove(true)}
                        disabled={isRemoving}
                        className="ml-auto min-h-[44px] px-3 text-sm font-semibold text-slate-500 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                        Quitar
                    </button>
                )}
            </div>

            {confirmRemove && (
                <Modal
                    title="¿Quitar este casillero?"
                    onClose={() => { if (!isRemoving) setConfirmRemove(false); }}
                    className="sm:max-w-md"
                    footer={
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant={ButtonVariant.CANCEL} onClick={() => setConfirmRemove(false)} disabled={isRemoving}>
                                Cancelar
                            </Button>
                            <Button variant={ButtonVariant.DANGER} onClick={handleConfirmRemove} disabled={isRemoving}>
                                {isRemoving ? <Loader2 size={16} className="animate-spin" /> : 'Quitar casillero'}
                            </Button>
                        </div>
                    }
                >
                    <p className="text-sm text-slate-600">
                        {customerFirstName} ya no podrá recibir paquetes con <span className="font-mono font-bold text-slate-800">{code}</span>.
                    </p>
                </Modal>
            )}
        </div>
    );
}

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
        handleInviteToComeBack,
        isInvitingToComeBack,
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
        handleOrderAddressesSaved,
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
    const [isOrderAddressesModalOpen, setIsOrderAddressesModalOpen] = React.useState(false);
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
    const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);
    // El retiro en oficina no tiene entrega: la orden se crea sin dirección.
    const isPickupSelected = !!activeDeliveryMethods.find((m) => m.code === selectedDeliveryMethod)?.is_pickup;

    if (isLoading || !customer) {
        return (
            <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 xl:gap-8 animate-pulse">
                <div className="bg-white rounded-[24px] xl:rounded-[32px] border border-slate-100 h-48 xl:h-80" />
                <div className="space-y-6">
                    <div className="bg-white rounded-[24px] border border-slate-100 h-24" />
                    <div className="bg-white rounded-[32px] border border-slate-100 h-48" />
                    <div className="bg-white rounded-[32px] border border-slate-100 h-48" />
                </div>
            </div>
        );
    }

    const metricPackageCount = metrics != null ? String(metrics.packageCount) : '—';
    const metricTotalLbs = metrics != null ? formatWeight(metrics.totalLbs) : '—';
    const metricTotalSpent = metrics != null ? formatCrc(metrics.totalSpent) : '—';
    const metricFirstPackageDate = metrics != null ? metrics.firstPackageDate : EMPTY_DATE;
    const metricLastPackageDate = metrics != null ? metrics.lastPackageDate : EMPTY_DATE;
    const hasLastPackage = metricLastPackageDate !== EMPTY_DATE;
    const hasFirstPackage = metricFirstPackageDate !== EMPTY_DATE;
    const customerDatesLine = `Cliente desde ${formatBusinessDate(customer.created_at)}${hasFirstPackage ? ` · primer paquete ${metricFirstPackageDate}` : ''}${hasLastPackage ? ` · último paquete ${metricLastPackageDate}` : ''}`;

    const renderEditButton = (className: string) => (
        <Button variant={ButtonVariant.CANCEL} onClick={enterEditMode} className={className}>
            <Edit3 size={14} /> Editar cliente
        </Button>
    );

    return (
        <div className="flex flex-col gap-6">
            {/* Bajo xl el perfil es una cabecera horizontal sobre el contenido; con el
                menú abierto un iPad en horizontal queda por debajo de xl. */}
            <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-5 xl:gap-8">
                {/* PERFIL */}
                <aside className="min-w-0">
                    <div className="bg-white rounded-[24px] xl:rounded-[32px] border border-slate-100 shadow-sm p-4 sm:p-5 xl:p-8 xl:sticky xl:top-6">
                        <div className="flex items-start gap-4 xl:flex-col xl:items-center xl:text-center">
                            <div className="h-12 w-12 sm:h-14 sm:w-14 xl:h-20 xl:w-20 bg-slate-50 text-primary rounded-2xl xl:rounded-[1.5rem] flex items-center justify-center text-lg xl:text-2xl font-black border-2 border-primary/5 uppercase flex-shrink-0">
                                {initials}
                            </div>

                            <div className="min-w-0 flex-1 xl:flex-none xl:w-full space-y-2">
                                <div className="space-y-0.5">
                                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-xl leading-tight break-words text-slate-900">
                                        {customer.first_name} {customer.last_name}
                                    </Typography>
                                    <Typography variant={TypographyVariant.CAPTION} className="text-sm font-mono font-bold text-slate-700 block break-all">
                                        {customer.customer_code}
                                    </Typography>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 xl:justify-center">
                                    {customer.customer_type_name ? (
                                        <CustomerTypeBadge
                                            name={customer.customer_type_name}
                                            mode={customer.customer_type_billing_mode}
                                            discount={customer.customer_type_discount_percent}
                                        />
                                    ) : (
                                        // Sin tipo asignado el cobro cae en precio de lista sin
                                        // que nada lo indique — se hace visible para poder corregirlo.
                                        <Badge tone={BadgeTone.WARNING}>Sin tipo asignado</Badge>
                                    )}
                                    <Badge tone={customer.is_active ? BadgeTone.SUCCESS : BadgeTone.NEUTRAL}>
                                        {customer.is_active ? 'Activo' : 'Inactivo'}
                                    </Badge>
                                </div>
                            </div>

                            {!isEditMode && renderEditButton('hidden sm:flex xl:hidden flex-shrink-0')}
                        </div>

                        <p className="mt-3 text-xs text-slate-500 xl:text-center">{customerDatesLine}</p>

                        {/* Fidelización: solo para inactivos, que es a quienes va la invitación. */}
                        {!customer.is_active && (
                            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center xl:flex-col xl:items-stretch">
                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-500 font-semibold xl:text-center">
                                    {customer.win_back_pending
                                        ? 'Pendiente de invitar a volver'
                                        : `Invitado el ${formatBusinessDate(customer.win_back_sent_at ?? '')}`}
                                </Typography>
                                <button
                                    onClick={handleInviteToComeBack}
                                    disabled={isInvitingToComeBack}
                                    className={`flex items-center justify-center gap-2 px-4 min-h-[44px] rounded-2xl text-sm font-bold transition-all disabled:opacity-40 ${
                                        customer.win_back_pending
                                            ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                                            : 'bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100'
                                    }`}
                                >
                                    <MessageCircle size={15} />
                                    {customer.win_back_pending ? 'Invitar a volver' : 'Volver a invitar'}
                                </button>
                            </div>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 xl:grid-cols-1 gap-3 xl:gap-4">
                            <div className="min-w-0">
                                <p className="flex items-start gap-2 text-sm font-semibold text-slate-800">
                                    <IdCard size={14} className="text-slate-400 flex-shrink-0 mt-1" />
                                    <span className="break-all">{customer.id_card}</span>
                                </p>
                                {/* El tipo de identificación se podía editar pero no se mostraba
                                    en ninguna parte de la ficha. */}
                                <p className="pl-6 text-xs text-slate-500">{idDocumentLabel(customer.id_type)}</p>
                            </div>
                            <p className="flex items-start gap-2 text-sm font-semibold text-slate-800 whitespace-nowrap">
                                <Phone size={14} className="text-slate-400 flex-shrink-0 mt-1" />
                                {applyPhoneMask(customer.phone)}
                            </p>
                            <p className="flex items-start gap-2 text-sm font-semibold text-slate-800 min-w-0">
                                <Mail size={14} className="text-slate-400 flex-shrink-0 mt-1" />
                                <span className="min-w-0 break-words [overflow-wrap:anywhere]">{customer.email}</span>
                            </p>
                        </div>

                        {!isEditMode && renderEditButton('mt-4 w-full sm:hidden xl:flex')}
                    </div>
                </aside>

                {/* CONTENIDO CENTRAL */}
                <main className="space-y-6 min-w-0">

                    {isEditMode && editForm ? (
                        /* MODO EDICIÓN */
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg text-slate-900">Editar cliente</Typography>
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
                                {DETAIL_TABS.map((tab) => (
                                    <button
                                        key={tab.key}
                                        onClick={() => setActiveTab(tab.key)}
                                        className={`px-2 min-h-[44px] border-b-2 transition-all font-bold text-sm flex items-center gap-2 ${activeTab === tab.key ? 'border-teal-700 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'
                                            }`}
                                    >
                                        {tab.label}
                                        {tab.key === 'history' && unassignedPackages.length > 0 && (
                                            <span className="bg-amber-100 text-amber-700 text-xs font-black px-2 py-0.5 rounded-full">
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
                                    <div className={`${CARD_CLASSNAME} space-y-4`}>
                                        <div className="flex items-center justify-between gap-3 flex-wrap">
                                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Casilleros</Typography>
                                            {availableCourierRates.length === 0 ? (
                                                <p className="text-sm text-slate-500">Ya tiene todos los couriers.</p>
                                            ) : (
                                                <button
                                                    onClick={() => { setRateToAssign(''); openAssignCodeModal(); }}
                                                    title="Asignarle un casillero en otro courier"
                                                    className="flex items-center gap-1.5 px-4 min-h-[44px] bg-amber-600 text-white rounded-2xl text-sm font-bold hover:bg-amber-700 transition-colors"
                                                >
                                                    <Plus size={14} /> Asignar casillero
                                                </button>
                                            )}
                                        </div>
                                        {/* Couriers activos sin casillero configurado: eso se arregla
                                            en Couriers, no aquí. */}
                                        {couriersWithoutWarehouse.length > 0 && (
                                            <p className="text-xs font-medium text-amber-700">
                                                {couriersWithoutWarehouse.join(', ')} {couriersWithoutWarehouse.length === 1 ? 'no tiene' : 'no tienen'} casillero configurado.{' '}
                                                <button
                                                    onClick={() => router.push('/admin/courier-rates')}
                                                    className="underline font-bold hover:text-amber-800"
                                                >
                                                    Configurarlo en Couriers
                                                </button>
                                            </p>
                                        )}
                                        {customer.warehouse_codes.length === 0 ? (
                                            <p className="text-slate-500 text-sm">Aún no tiene casillero asignado.</p>
                                        ) : (
                                            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-3">
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

                                    {/* Métricas reales (paquetes, peso, facturado). Sin truncar:
                                        un monto cortado se lee como otro monto. Los íconos solo
                                        aparecen en pantallas anchas para dejarle el espacio al dato. */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 xl:gap-4">
                                        <div className="bg-white p-4 xl:p-5 rounded-[20px] xl:rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3 xl:gap-4 min-w-0">
                                            <div className="hidden 2xl:block p-3 bg-amber-50 text-amber-600 rounded-2xl flex-shrink-0"><Box size={24} /></div>
                                            <div className="min-w-0">
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-500 font-bold">Paquetes</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black whitespace-nowrap text-lg md:text-lg">{metricPackageCount}</Typography>
                                            </div>
                                        </div>
                                        <div className="bg-white p-4 xl:p-5 rounded-[20px] xl:rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3 xl:gap-4 min-w-0">
                                            <div className="hidden 2xl:block p-3 bg-emerald-50 text-emerald-600 rounded-2xl flex-shrink-0"><TrendingUp size={24} /></div>
                                            <div className="min-w-0">
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-500 font-bold">Libras</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black whitespace-nowrap text-lg md:text-lg">{metricTotalLbs}</Typography>
                                            </div>
                                        </div>
                                        <div className="col-span-2 sm:col-span-1 bg-white p-4 xl:p-5 rounded-[20px] xl:rounded-[24px] border border-slate-100 shadow-sm flex items-center gap-3 xl:gap-4 min-w-0">
                                            <div className="hidden 2xl:block p-3 bg-primary/5 text-primary rounded-2xl flex-shrink-0"><DollarSign size={24} /></div>
                                            <div className="min-w-0">
                                                <Typography variant={TypographyVariant.CAPTION} className="text-slate-500 font-bold">Facturado</Typography>
                                                <Typography variant={TypographyVariant.SUBTITLE} className="!mb-0 font-black whitespace-nowrap text-lg md:text-lg">{metricTotalSpent}</Typography>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Dos columnas solo desde 2xl: con el menú abierto el contenido
                                        de la ficha mide menos de 700 px hasta ahí y partirlo en dos
                                        deja las direcciones ilegibles. */}
                                    <div className="grid grid-cols-1 2xl:grid-cols-2 gap-5 xl:gap-6">
                                        {/* Direcciones */}
                                        <div className={`${CARD_CLASSNAME} space-y-4 min-w-0`}>
                                            <div className="flex justify-between items-center gap-3">
                                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Direcciones</Typography>
                                                {/* Abre el modal dedicado en vez del formulario completo
                                                    del cliente: agregar una dirección no debería obligar a
                                                    reenviar nombre, correo y tipo de cliente. */}
                                                {customer.addresses.length > 0 && (
                                                    <button
                                                        onClick={() => setIsAddressesModalOpen(true)}
                                                        className="flex items-center gap-1 px-3 min-h-[44px] text-sm font-bold text-teal-700 hover:bg-primary/5 rounded-2xl transition-colors flex-shrink-0"
                                                    >
                                                        Editar direcciones
                                                    </button>
                                                )}
                                            </div>
                                            {customer.addresses.length === 0 ? (
                                                <EmptyState
                                                    title="Aún no tiene dirección"
                                                    actionLabel="Agregar dirección"
                                                    onAction={() => setIsAddressesModalOpen(true)}
                                                    className="py-6"
                                                />
                                            ) : (
                                                <div className="space-y-3">
                                                    {customer.addresses.map((addr) => {
                                                        const addressLabel = addr.address_label || 'Dirección';
                                                        // Si la etiqueta ya dice "Principal" el badge repetiría lo mismo.
                                                        const showDefaultBadge = addr.is_default && addressLabel.trim().toLowerCase() !== PRINCIPAL_ADDRESS_LABEL;
                                                        return (
                                                            <div key={addr.id} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex gap-3 min-w-0">
                                                                <div className="p-2 bg-white rounded-xl h-fit text-primary shadow-sm border border-slate-100 flex-shrink-0"><MapPin size={20} /></div>
                                                                <div className="flex-1 min-w-0 break-words">
                                                                    <div className="flex flex-wrap items-center gap-2 mb-1">
                                                                        <Typography variant={TypographyVariant.BODY_BOLD}>{addressLabel}</Typography>
                                                                        {showDefaultBadge && <Badge tone={BadgeTone.NEUTRAL}>Principal</Badge>}
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 font-medium">
                                                                        {addr.province}, {addr.canton}, {addr.district}
                                                                    </p>
                                                                    <p className="text-sm text-slate-600 font-medium">{addr.exact_address}</p>
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>

                                        <div className={`${CARD_CLASSNAME} space-y-4 min-w-0`}>
                                            <div>
                                                <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Personas que reciben</Typography>
                                                <p className="text-sm text-slate-500 mt-1">Quién puede recibir los paquetes por el cliente.</p>
                                            </div>
                                            <CustomerRecipientsList customerId={customer.id} customerName={`${customer.first_name} ${customer.last_name}`} />
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
                                            {/* Paquetes sin orden — seleccionables para crear orden de envío */}
                                            <div className={ACTIVITY_CARD_CLASSNAME}>
                                                <div className="flex flex-wrap items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-amber-50 rounded-lg"><Package size={14} className="text-amber-600" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>Paquetes sin orden</Typography>
                                                    <span className="text-xs font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">{unassignedPackages.length}</span>
                                                    {unassignedPackages.length > 0 && (
                                                        <button
                                                            onClick={handleNotifyWhatsApp}
                                                            disabled={isNotifying}
                                                            title="Notifica de sus paquetes sin orden de envío"
                                                            className="ml-auto flex items-center gap-1.5 px-4 min-h-[44px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-sm font-bold transition-all disabled:opacity-50"
                                                        >
                                                            <MessageCircle size={14} />
                                                            {isNotifying ? 'Abriendo...' : 'Avisar por WhatsApp'}
                                                        </button>
                                                    )}
                                                </div>
                                                {unassignedPackages.length === 0 ? (
                                                    <p className="text-sm text-slate-500 text-center py-6">No hay paquetes por enviar.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {unassignedPackages.map((pkg) => {
                                                            const selected = selectedPackageUuids.includes(pkg.uuid);
                                                            return (
                                                                <button
                                                                    key={pkg.uuid}
                                                                    onClick={() => handleTogglePackage(pkg.uuid)}
                                                                    className={`w-full flex items-center justify-between gap-3 p-4 min-h-[44px] rounded-2xl border text-left transition-all ${
                                                                        selected ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-transparent hover:border-slate-200'
                                                                    }`}
                                                                >
                                                                    <div className="flex items-center gap-3 min-w-0">
                                                                        {selected
                                                                            ? <CheckSquare size={18} className="text-amber-600 flex-shrink-0" />
                                                                            : <Square size={18} className="text-slate-300 flex-shrink-0" />
                                                                        }
                                                                        <div className="min-w-0">
                                                                            <p className="text-sm font-mono font-black text-slate-800 break-all">{pkg.tracking_number}</p>
                                                                            <p className="text-xs text-slate-500 break-words">{pkg.courier_rate_name ?? '—'} · {formatWeight(pkg.weight_lb)}</p>
                                                                        </div>
                                                                    </div>
                                                                    <Badge tone={packageStatusTone(pkg.status)} className="flex-shrink-0">
                                                                        {packageStatusLabel(pkg.status)}
                                                                    </Badge>
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                                {selectedPackageUuids.length > 0 && (
                                                    <div className="flex flex-wrap items-center justify-between gap-3 mt-4 pt-4 border-t border-slate-100">
                                                        <span className="text-sm font-semibold text-slate-600">
                                                            {formatCount(selectedPackageUuids.length, 'paquete seleccionado', 'paquetes seleccionados')}
                                                        </span>
                                                        <div className="flex items-center gap-2">
                                                            <button onClick={clearSelection} className={TEXT_BUTTON_CLASSNAME}>
                                                                Limpiar
                                                            </button>
                                                            <button
                                                                onClick={handleCreateOrder}
                                                                disabled={isCreatingOrder}
                                                                className={DARK_BUTTON_CLASSNAME}
                                                            >
                                                                {isCreatingOrder ? 'Creando...' : 'Crear orden de envío'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Paquetes en órdenes activas — solo lectura, enlace a la orden */}
                                            <div className={ACTIVITY_CARD_CLASSNAME}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-blue-50 rounded-lg"><Boxes size={14} className="text-blue-600" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>En órdenes activas</Typography>
                                                    <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">{assignedPackages.length}</span>
                                                </div>
                                                {assignedPackages.length === 0 ? (
                                                    <p className="text-sm text-slate-500 text-center py-6">No hay paquetes por enviar.</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {assignedPackages.map((pkg) => (
                                                            <div key={pkg.uuid} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <Package size={16} className="text-slate-400 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-mono font-black text-slate-800 break-all">{pkg.tracking_number}</p>
                                                                        <p className="text-xs text-slate-500 break-words">{pkg.courier_rate_name ?? '—'} · {formatWeight(pkg.weight_lb)}</p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => router.push(`/admin/shipment-orders/${pkg.consolidation_uuid}`)}
                                                                    className="flex items-center gap-1 min-h-[44px] pl-1 flex-shrink-0"
                                                                >
                                                                    <span className="text-sm font-semibold text-teal-700">Ver orden</span>
                                                                    <ChevronRight size={14} className="text-teal-700" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Historial */}
                                            <div className={ACTIVITY_CARD_CLASSNAME}>
                                                <div className="flex items-center gap-2 mb-4">
                                                    <div className="p-1.5 bg-slate-50 rounded-lg"><Clock size={14} className="text-slate-500" /></div>
                                                    <Typography variant={TypographyVariant.BODY_BOLD}>Historial de paquetes</Typography>
                                                    <span className="ml-auto text-xs font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{filteredHistory.length}</span>
                                                </div>
                                                <div className="mb-3">
                                                    <input
                                                        className="w-full min-h-[44px] px-4 bg-slate-50 border border-slate-100 rounded-xl text-base outline-none focus:border-amber-200"
                                                        placeholder="Buscar por número de rastreo o courier"
                                                        onChange={(e) => setSearchTerm(e.target.value)}
                                                    />
                                                </div>
                                                {filteredHistory.length === 0 ? (
                                                    <p className="text-sm text-slate-500 text-center py-6">
                                                        {searchTerm ? 'Ningún paquete coincide con la búsqueda' : 'Este cliente aún no tiene paquetes'}
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {filteredHistory.map((pkg) => (
                                                            <div key={pkg.uuid} className="flex items-center justify-between gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                                                <div className="flex items-center gap-3 min-w-0">
                                                                    <Clock size={16} className="text-slate-400 flex-shrink-0" />
                                                                    <div className="min-w-0">
                                                                        <p className="text-sm font-mono font-black text-slate-800 break-all">{pkg.tracking_number}</p>
                                                                        <p className="text-xs text-slate-500 break-words">
                                                                            {pkg.courier_rate_name ?? '—'} · {formatWeight(pkg.weight_lb)}
                                                                            {pkg.consolidation_uuid ? ' · en orden' : ''}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {/* El estado real de cada paquete: el historial ya no
                                                                    asume que todo lo listado está entregado. */}
                                                                <Badge tone={packageStatusTone(pkg.status)} className="flex-shrink-0">
                                                                    {packageStatusLabel(pkg.status)}
                                                                </Badge>
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
                    startWithNewAddress={customer.addresses.length === 0}
                />
            )}

            {/* Asignar un casillero nuevo a un cliente ya creado. Solo lista
                couriers cuya ruta el cliente todavía no tiene: repetir una no
                genera código nuevo. */}
            {isOrderAddressesModalOpen && addressModalTarget && (
                <CustomerAddressesModal
                    customerId={customer.id}
                    addresses={addressModalTarget.addresses}
                    onSaved={handleOrderAddressesSaved}
                    onClose={() => setIsOrderAddressesModalOpen(false)}
                    startWithNewAddress={addressModalTarget.addresses.length === 0}
                />
            )}

            {isAssignCodeModalOpen && (
                <Modal
                    title="Asignar casillero"
                    subtitle={`Se crea un código nuevo para ${customer.first_name}.`}
                    onClose={() => { if (!isAssigningCode) closeAssignCodeModal(); }}
                    className="sm:max-w-md"
                    footer={
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant={ButtonVariant.CANCEL} onClick={closeAssignCodeModal} disabled={isAssigningCode}>
                                Cancelar
                            </Button>
                            <button
                                onClick={() => assignWarehouseCode(rateToAssign)}
                                disabled={isAssigningCode || !rateToAssign}
                                className={DARK_BUTTON_CLASSNAME}
                            >
                                {isAssigningCode ? <><Loader2 size={14} className="animate-spin" /> Asignando...</> : 'Asignar casillero'}
                            </button>
                        </div>
                    }
                >
                    <label className="text-sm font-semibold text-slate-700 mb-1.5 block">Courier</label>
                    <select
                        className={SELECT_CLASSNAME}
                        value={rateToAssign}
                        onChange={(e) => setRateToAssign(e.target.value)}
                    >
                        <option value="">Selecciona un courier...</option>
                        {availableCourierRates.map((r) => (
                            <option key={r.uuid} value={r.uuid}>
                                {r.name} · {r.origin} · {packageTypeLabel(r.package_type)}
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
                            <p className="text-sm text-slate-500 mt-2">
                                Se le asignará el código <span className="font-mono font-bold text-slate-700">{nextCode}</span>
                            </p>
                        );
                    })()}
                </Modal>
            )}

            {addressModalTarget && (
                <Modal
                    title="Nueva orden de envío"
                    onClose={() => setAddressModalTarget(null)}
                    className="sm:max-w-md"
                    footer={
                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button variant={ButtonVariant.CANCEL} onClick={() => setAddressModalTarget(null)}>
                                Cancelar
                            </Button>
                            <button
                                onClick={() => handleConfirmCreateOrderWithAddress(isPickupSelected)}
                                disabled={(!selectedAddressId && !isPickupSelected) || !selectedDeliveryMethod || isCreatingOrder}
                                className={DARK_BUTTON_CLASSNAME}
                            >
                                {isCreatingOrder ? 'Creando...' : 'Crear orden de envío'}
                            </button>
                        </div>
                    }
                >
                    <p className="text-sm font-semibold text-slate-700 mb-2">Método de entrega</p>
                    <div className="space-y-2">
                        {activeDeliveryMethods.map((dm) => (
                            <button
                                key={dm.code}
                                onClick={() => setSelectedDeliveryMethod(dm.code)}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-left transition-all border ${
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

                    {!isPickupSelected && (
                        <div className="mt-6">
                            <p className="text-sm font-semibold text-slate-700 mb-2">Dirección</p>
                            {
                        addressModalTarget.addresses.length === 0 ? (
                            <EmptyState
                                title="Aún no tiene dirección"
                                actionLabel="Agregar dirección"
                                onAction={() => setIsOrderAddressesModalOpen(true)}
                                className="py-6"
                            />
                        ) : (
                    <div className="space-y-2 mb-6">
                        {addressModalTarget.addresses.map((addr) => (
                            <button
                                key={addr.id}
                                onClick={() => setSelectedAddressId(addr.id)}
                                className={`w-full flex items-center justify-between gap-3 px-4 py-3 min-h-[44px] rounded-2xl text-left transition-all border ${
                                    selectedAddressId === addr.id
                                        ? 'bg-slate-900 text-white border-slate-900'
                                        : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                                }`}
                            >
                                <div className="min-w-0">
                                    <p className="font-bold text-sm break-words">{addr.address_label || 'Dirección'}{addr.is_default && (addr.address_label ?? '').trim().toLowerCase() !== PRINCIPAL_ADDRESS_LABEL ? ' · Principal' : ''}</p>
                                    <p className={`text-xs mt-0.5 break-words ${selectedAddressId === addr.id ? 'text-slate-300' : 'text-slate-500'}`}>
                                        {addr.exact_address}, {addr.district}, {addr.canton}, {addr.province}
                                    </p>
                                </div>
                                {selectedAddressId === addr.id && (
                                    <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                                )}
                            </button>
                        ))}
                    </div>
                        )}
                        </div>
                    )}
                </Modal>
            )}
        </div>
    );
};
