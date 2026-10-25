import { formatBusinessDate } from '@/shared/utils/timezone';
import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import { useRouter } from 'next/router';
import { Search, User, Plus, Box, PackageCheck, MapPin, CheckCircle, MessageCircle } from 'lucide-react';
import { DateRangeFilter } from '@/components/common/date-range-filter/date-range-filter';
import { usePackages } from './use-logistics';
import { Column, NewTable } from '@/components/common/new-table/new-table';
import { NotifyPackagesModal } from '@/components/common/notify-packages-modal/notify-packages-modal';
import { Badge } from '@/components/common/badge/badge';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { Modal } from '@/components/common/modal/modal';
import { LoadErrorPanel } from '../load-error-panel';
import { LogisticsPackage, PackageType } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { CustomerAddressesModal } from '@/components/containers/customers/customer-detail/customer-addresses-modal';
import { CustomerRecipientsList } from '@/components/containers/customers/customer-recipients/customer-recipients-list';
import { describeOrder, describePackageStatus } from '../logistics-labels';

const PAGE_SIZE = 7;

const PACKAGE_TYPE_LABEL: Record<PackageType, string> = {
    [PackageType.AEREO]: 'Aéreo',
    [PackageType.MARITIMO]: 'Marítimo',
};

const SELECTION_CELL_SIZE = 'h-11 w-11';

const TOGGLE_BUTTON_BASE = 'min-h-[44px] px-4 rounded-lg text-sm font-semibold transition-all whitespace-nowrap';

const PackageStatusBadge: React.FC<{ status: string }> = ({ status }) => {
    const { label, tone } = describePackageStatus(status);
    return <Badge tone={tone}>{label}</Badge>;
};

// --- Sub-componente interno para las métricas rápidas ---
const MetricItem = ({ label, icon }: { label: string; icon: React.ReactNode }) => (
    <div className="flex items-center gap-3 cursor-default">
        <div className="p-2.5 rounded-xl border border-amber-100 bg-amber-50/50 text-amber-600">
            {icon}
        </div>
        <span className="whitespace-nowrap text-base font-black text-slate-800">{label}</span>
    </div>
);

interface SelectionCheckboxProps {
    isChecked: boolean;
    isDisabled: boolean;
    onToggle: () => void;
    label: string;
}

// La celda entera es el objetivo táctil: con la casilla sola (20 px) el dedo falla.
const SelectionCheckbox: React.FC<SelectionCheckboxProps> = ({ isChecked, isDisabled, onToggle, label }) => (
    <label
        onClick={(e) => e.stopPropagation()}
        className={`flex ${SELECTION_CELL_SIZE} flex-shrink-0 items-center justify-center ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
        <input
            type="checkbox"
            aria-label={label}
            checked={isChecked}
            disabled={isDisabled}
            onChange={onToggle}
            className="h-5 w-5 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer disabled:cursor-not-allowed disabled:opacity-30"
        />
    </label>
);

export const LogisticsContainer: React.FC = () => {
    const router = useRouter();

    const {
        isFromOperations, packages, isLoading, isError, refetch, meta,
        handlePageChange, handleSearch,
        viewMode, setViewMode,
        consolidationFilter, setConsolidationFilter,
        customers, customerUuid, setCustomerUuid,
        dateFrom, setDateFrom,
        dateTo, setDateTo,
        selectedUuids, selectedCustomerId, handleToggleSelect, handleRowClick, clearSelection,
        handleCreateOrder, isCreatingOrder,
        notifyMultiple,
        addressModalTarget, setAddressModalTarget, selectedAddressId, setSelectedAddressId,
        selectedDeliveryMethod, setSelectedDeliveryMethod,
        selectedRecipientId, setSelectedRecipientId,
        handleConfirmCreateOrderWithAddress, handleAddressesSaved,
    } = usePackages(PAGE_SIZE);
    const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
    const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);
    const [showManageAddresses, setShowManageAddresses] = React.useState(false);
    const isPickupSelected = !!activeDeliveryMethods.find((m) => m.code === selectedDeliveryMethod)?.is_pickup;
    const modalCustomer = packages.find((p) => p.customer_id === addressModalTarget?.customerUuid);
    const modalCustomerName = [modalCustomer?.first_name, modalCustomer?.last_name].filter(Boolean).join(' ') || 'El cliente';

    const showSelection = viewMode === 'activos' && consolidationFilter === 'SIN_ORDEN';
    const visibleSelectedCount = packages.filter((p) => selectedUuids.includes(p.uuid)).length;
    const hiddenSelectedCount = selectedUuids.length - visibleSelectedCount;

    const isSelectionBlocked = (pkg: LogisticsPackage) =>
        showSelection && !!selectedCustomerId && pkg.customer_id !== selectedCustomerId;

    const packageTypeLabel = (type: PackageType | null) => (type ? PACKAGE_TYPE_LABEL[type] ?? type : PACKAGE_TYPE_LABEL[PackageType.AEREO]);

    const totalNouns: [string, string] = viewMode === 'historial'
        ? ['paquete entregado', 'paquetes entregados']
        : consolidationFilter === 'SIN_ORDEN'
            ? ['paquete sin orden', 'paquetes sin orden']
            : ['paquete con orden', 'paquetes con orden'];
    const totalLabel = isLoading || isError ? `— ${totalNouns[1]}` : formatCount(meta.total || 0, ...totalNouns);

    const columns: Column[] = [
        ...(showSelection ? [{
            header: '',
            accessor: '__select',
            minWidth: 56,
            render: (row: LogisticsPackage) => (
                <SelectionCheckbox
                    isChecked={selectedUuids.includes(row.uuid)}
                    isDisabled={isSelectionBlocked(row)}
                    onToggle={() => handleToggleSelect(row)}
                    label={`Seleccionar paquete ${row.tracking_number}`}
                />
            ),
        } as Column] : []),
        {
            header: 'Número de rastreo',
            accessor: 'tracking_number',
            render: (row) => (
                <button
                    onClick={(e) => { e.stopPropagation(); router.push(`/admin/logistics/${row.uuid}`); }}
                    className="flex min-h-[44px] flex-col justify-center text-left hover:underline decoration-amber-300 underline-offset-2 max-w-[180px]"
                    title={row.tracking_number}
                >
                    {/* max-w + truncate: un tracking de courier puede pasar de 30
                        caracteres y ensanchaba la columna sobre las demás. */}
                    <span className="font-mono text-slate-700 text-sm uppercase font-bold tracking-tight truncate w-full">{row.tracking_number}</span>
                    {/* La columna "Info. envío" solo cabe desde 2xl: antes se resume aquí. */}
                    <span className="text-xs text-slate-500 mt-0.5 2xl:hidden">
                        {packageTypeLabel(row.package_type)} · {formatBusinessDate(row.created_at)}
                    </span>
                </button>
            )
        },
        {
            header: 'Cliente',
            accessor: 'customer',
            minWidth: 170,
            render: (row) => (
                <div className="flex items-center gap-3">
                    <div className="h-8 w-8 flex-shrink-0 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                        <User size={12} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-slate-700 font-bold text-sm leading-tight">
                            {row.first_name} {row.last_name}
                        </span>
                        <span className="text-xs font-mono font-bold text-amber-600 mt-0.5 whitespace-nowrap">
                            {row.customer_code}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: 'Info. envío',
            accessor: 'package_type',
            className: 'hidden 2xl:table-cell',
            noWrap: true,
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-600">{packageTypeLabel(row.package_type)}</span>
                    <span className="text-xs text-slate-500 mt-0.5">{formatBusinessDate(row.created_at)}</span>
                </div>
            )
        },
        {
            header: 'Peso',
            accessor: 'weight_lb',
            noWrap: true,
            render: (row) => (
                <span className="inline-flex whitespace-nowrap bg-slate-50 px-2 py-1 rounded-lg border border-slate-100 text-slate-900 font-black text-sm">
                    {formatWeight(row.weight_lb)}
                </span>
            )
        },
        {
            header: 'Estado',
            accessor: 'status',
            noWrap: true,
            render: (row) => <PackageStatusBadge status={row.status} />,
        },
        ...(viewMode === 'activos' && consolidationFilter === 'CON_ORDEN' ? [{
            header: 'Orden',
            accessor: 'consolidation_uuid',
            noWrap: true,
            render: (row: LogisticsPackage) => (
                row.consolidation_uuid ? (
                    <button
                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/shipment-orders/${row.consolidation_uuid}`); }}
                        className="min-h-[44px] flex items-center"
                    >
                        {(() => {
                            const order = describeOrder(row.consolidation_step, row.consolidation_status);
                            return order ? <Badge tone={order.tone}>{order.label}</Badge> : <Badge>Ver orden</Badge>;
                        })()}
                    </button>
                ) : <span className="text-slate-300 text-xs">—</span>
            ),
        } as Column] : []),
    ];

    return (
        <div className={`flex flex-col gap-6 animate-in fade-in duration-500 ${showSelection ? 'pb-32' : 'pb-10'}`}>

            {/* ACTION BAR: MÉTRICAS + ACCIONES */}
            <div className="flex flex-col gap-4 bg-white p-4 rounded-[2.5rem] border border-slate-100 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="min-w-0 px-4">
                    <MetricItem
                        label={totalLabel}
                        icon={<Box size={16} />}
                    />
                </div>

                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center md:shrink-0">
                    <Button
                        variant={ButtonVariant.GHOST}
                        onClick={notifyMultiple.open}
                        className="w-full whitespace-nowrap sm:w-auto"
                    >
                        <MessageCircle size={16} strokeWidth={2.5} />
                        Avisar por WhatsApp
                    </Button>
                    <Button
                        variant={ButtonVariant.PRIMARY}
                        onClick={() => router.push('/admin/logistics/create')}
                        className="w-full whitespace-nowrap sm:w-auto"
                    >
                        <Plus size={16} strokeWidth={3} />
                        Registrar paquete
                    </Button>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                {/* Fila principal: toggle + search + período */}
                <div className="flex flex-wrap items-center gap-3 p-4 border-b border-slate-50">
                    {/* Toggle Activos / Historial */}
                    <div className="flex gap-0.5 bg-slate-100/70 p-1 rounded-xl flex-shrink-0">
                        <button
                            onClick={() => setViewMode('activos')}
                            className={`${TOGGLE_BUTTON_BASE} ${viewMode === 'activos'
                                ? 'bg-white text-slate-800 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Activos
                        </button>
                        <button
                            onClick={() => setViewMode('historial')}
                            className={`${TOGGLE_BUTTON_BASE} ${viewMode === 'historial'
                                ? 'bg-white text-emerald-700 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'
                            }`}
                        >
                            Historial
                        </button>
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 min-w-[200px]">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Rastreo, código o nombre..."
                            aria-label="Buscar paquetes"
                            className="w-full min-h-[44px] bg-slate-50 pl-10 pr-4 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-base"
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                    </div>

                    <div className="flex flex-shrink-0">
                        <DateRangeFilter
                            from={dateFrom} to={dateTo}
                            onFromChange={setDateFrom} onToChange={setDateTo}
                            onClear={() => { setDateFrom(''); setDateTo(''); }}
                        />
                    </div>
                </div>

                {/* Fila de filtros: Sin orden / Con orden + filtro por cliente — solo en modo activos */}
                {viewMode === 'activos' && (
                    <div className="px-4 py-3 flex flex-wrap items-center gap-2">
                        <div className="flex gap-1">
                            {[
                                { value: 'SIN_ORDEN', label: 'Sin orden' },
                                { value: 'CON_ORDEN', label: 'Con orden' },
                            ].map(({ value, label }) => (
                                <button
                                    key={value}
                                    onClick={() => setConsolidationFilter(value as 'SIN_ORDEN' | 'CON_ORDEN')}
                                    className={`${TOGGLE_BUTTON_BASE} ${consolidationFilter === value
                                        ? 'bg-slate-900 text-white'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                                    }`}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <select
                            value={customerUuid}
                            onChange={(e) => setCustomerUuid(e.target.value)}
                            aria-label="Filtrar por cliente"
                            className="min-h-[44px] bg-slate-50 px-3 py-1.5 rounded-lg border-none outline-none focus:ring-2 focus:ring-amber-100 text-base font-semibold text-slate-600 max-w-[240px]"
                        >
                            <option value="">Todos los clientes</option>
                            {customers.map((c) => (
                                <option key={c.id} value={c.id}>
                                    {c.first_name} {c.last_name} · {c.customer_code}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* BARRA DE ACCIÓN: SELECCIÓN DE PAQUETES */}
            {showSelection && selectedUuids.length > 0 && (
                <div className="fixed bottom-4 left-4 right-4 z-30 mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-lg lg:left-[17rem]">
                    <div className="flex items-center gap-2">
                        <PackageCheck size={18} />
                        <span className="text-sm font-bold">
                            {formatCount(selectedUuids.length, 'paquete seleccionado', 'paquetes seleccionados')}
                            {hiddenSelectedCount > 0 && (
                                <span className="text-slate-400 font-semibold">
                                    {' '}({hiddenSelectedCount} en otras páginas)
                                </span>
                            )}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearSelection}
                            className="min-h-[44px] text-sm font-semibold text-slate-300 hover:text-white px-3"
                        >
                            Limpiar
                        </button>
                        <Button
                            variant={ButtonVariant.ACCENT}
                            onClick={handleCreateOrder}
                            disabled={isCreatingOrder}
                            className="whitespace-nowrap"
                        >
                            {isCreatingOrder ? 'Creando...' : 'Crear orden de envío'}
                        </Button>
                    </div>
                </div>
            )}

            {isFromOperations && (
                <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-600">
                    {showSelection
                        ? 'Para armar una orden, marca los paquetes de un cliente y toca «Crear orden de envío».'
                        : 'Para armar una orden, ve a «Activos» y elige «Sin orden»: ahí marcas los paquetes de un cliente.'}
                </p>
            )}

            {isError ? (
                <LoadErrorPanel onRetry={() => refetch()} />
            ) : (
                <>
                {/* TARJETAS (hasta xl): la tabla completa no cabe en un iPad con el menú abierto */}
                <div className="xl:hidden">
                    {isLoading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
                                <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-24" />
                            ))}
                        </div>
                    ) : packages.length === 0 ? (
                        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
                            <EmptyState title="No hay paquetes para mostrar" />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {packages.map((pkg) => {
                                const isDisabledForSelection = isSelectionBlocked(pkg);
                                return (
                                    <div
                                        key={pkg.uuid}
                                        onClick={() => { if (!isDisabledForSelection) handleRowClick(pkg, showSelection); }}
                                        className={`bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex flex-col gap-2 hover:border-amber-100 transition-all active:scale-[0.99] cursor-pointer ${isDisabledForSelection ? 'opacity-40' : ''}`}
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            {showSelection && (
                                                <SelectionCheckbox
                                                    isChecked={selectedUuids.includes(pkg.uuid)}
                                                    isDisabled={isDisabledForSelection}
                                                    onToggle={() => handleToggleSelect(pkg)}
                                                    label={`Seleccionar paquete ${pkg.tracking_number}`}
                                                />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                {showSelection ? (
                                                    // block + w-full: en un <button> inline el truncate no
                                                    // recorta, y un tracking largo ensanchaba la tarjeta
                                                    // empujando el estado y el casillero fuera de pantalla.
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); router.push(`/admin/logistics/${pkg.uuid}`); }}
                                                        className="block w-full min-h-[44px] font-mono text-slate-700 text-sm font-bold uppercase truncate hover:underline decoration-amber-300 underline-offset-2 text-left"
                                                    >
                                                        {pkg.tracking_number}
                                                    </button>
                                                ) : (
                                                    <p className="font-mono text-slate-700 text-sm font-bold uppercase truncate">{pkg.tracking_number}</p>
                                                )}
                                                <p className="font-bold text-slate-800 text-sm mt-0.5 truncate">{pkg.first_name} {pkg.last_name}</p>
                                                <p className="text-xs text-slate-500 mt-0.5">{formatBusinessDate(pkg.created_at)} · {formatWeight(pkg.weight_lb)}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                                <PackageStatusBadge status={pkg.status} />
                                                <span className="text-xs font-mono font-bold text-amber-600 uppercase whitespace-nowrap">{pkg.customer_code}</span>
                                            </div>
                                        </div>
                                        {viewMode === 'activos' && consolidationFilter === 'CON_ORDEN' && pkg.consolidation_uuid && (
                                            <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                                                {(() => {
                                                    const order = describeOrder(pkg.consolidation_step, pkg.consolidation_status);
                                                    return order ? <Badge tone={order.tone}>{order.label}</Badge> : <span />;
                                                })()}
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); router.push(`/admin/shipment-orders/${pkg.consolidation_uuid}`); }}
                                                    className="min-h-[44px] px-2 text-sm font-bold text-amber-700 underline underline-offset-2"
                                                >
                                                    Ver orden
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {meta.totalPages > 1 && (
                        <div className="flex items-center justify-between gap-3 px-2 pt-4">
                            <Button
                                variant={ButtonVariant.CANCEL}
                                onClick={() => handlePageChange(Math.max(1, meta.page - 1))}
                                disabled={meta.page === 1}
                            >
                                Anterior
                            </Button>
                            <span className="text-sm text-slate-500 font-semibold">{meta.page} / {meta.totalPages}</span>
                            <Button
                                variant={ButtonVariant.CANCEL}
                                onClick={() => handlePageChange(Math.min(meta.totalPages, meta.page + 1))}
                                disabled={meta.page === meta.totalPages}
                            >
                                Siguiente
                            </Button>
                        </div>
                    )}
                </div>

                {/* TABLA PRINCIPAL (desde xl) */}
                <div className="hidden xl:block bg-white rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/30 overflow-hidden">
                    <NewTable
                        data={packages}
                        columns={columns}
                        isLoading={isLoading}
                        totalRows={meta.total}
                        currentPage={meta.page}
                        totalPages={meta.totalPages}
                        onPageChange={handlePageChange}
                        onRowClick={(item: LogisticsPackage) => {
                            if (isSelectionBlocked(item)) return;
                            handleRowClick(item, showSelection);
                        }}
                        rowClassName={(item: LogisticsPackage) => (isSelectionBlocked(item) ? 'opacity-40' : '')}
                        itemsPerPage={PAGE_SIZE}
                        itemSingular="paquete"
                        itemPlural="paquetes"
                        emptyTitle="No hay paquetes para mostrar"
                    />
                </div>
                </>
            )}

            {/* MODAL: ELEGIR DIRECCIÓN DE ENTREGA + MÉTODO DE ENTREGA (siempre, al crear la orden) */}
            {addressModalTarget && (
                <Modal
                    title="Nueva orden de envío"
                    onClose={() => setAddressModalTarget(null)}
                    footer={
                        <div className="grid grid-cols-2 gap-3">
                            <Button variant={ButtonVariant.CANCEL} onClick={() => setAddressModalTarget(null)}>
                                Cancelar
                            </Button>
                            <Button
                                variant={ButtonVariant.PRIMARY}
                                onClick={() => handleConfirmCreateOrderWithAddress(isPickupSelected)}
                                disabled={(!selectedAddressId && !isPickupSelected) || !selectedDeliveryMethod || isCreatingOrder}
                            >
                                {isCreatingOrder ? 'Creando…' : 'Crear orden'}
                            </Button>
                        </div>
                    }
                >
                    <div className="flex items-center justify-between gap-3 mb-2">
                        <p className="flex items-center gap-2 text-sm font-bold text-slate-600">
                            <MapPin size={16} className="text-slate-500" />
                            Dirección de entrega
                        </p>
                        <button
                            onClick={() => setShowManageAddresses(true)}
                            className="inline-flex items-center gap-1.5 min-h-[44px] px-3 bg-white border border-slate-200 text-slate-700 rounded-xl font-semibold text-sm hover:bg-slate-50 transition-colors"
                        >
                            <Plus size={14} /> {addressModalTarget.addresses.length === 0 ? 'Agregar' : 'Gestionar'}
                        </button>
                    </div>
                    {isPickupSelected ? (
                        <p className="text-sm text-slate-500 mb-6">No hace falta: el cliente retira en oficina.</p>
                    ) : addressModalTarget.addresses.length === 0 ? (
                        <p className="text-sm text-slate-500 mb-6">Este cliente no tiene direcciones. Agrega una, o elige retiro en oficina.</p>
                    ) : (
                        <div className="space-y-2 mb-6">
                            {addressModalTarget.addresses.map((addr) => (
                                <button
                                    key={addr.id}
                                    onClick={() => setSelectedAddressId(addr.id)}
                                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${
                                        selectedAddressId === addr.id
                                            ? 'bg-slate-900 text-white border-slate-900'
                                            : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                                    }`}
                                >
                                    <div>
                                        <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Principal' : ''}</p>
                                        <p className={`text-xs mt-0.5 ${selectedAddressId === addr.id ? 'text-slate-300' : 'text-slate-500'}`}>
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

                    {!isPickupSelected && (
                        <div className="mb-6">
                            <p className="text-sm font-bold text-slate-600 mb-2">¿Quién recibe?</p>
                            <CustomerRecipientsList
                                customerId={addressModalTarget.customerUuid}
                                customerName={modalCustomerName}
                                selectedId={selectedRecipientId}
                                onSelect={setSelectedRecipientId}
                            />
                        </div>
                    )}

                    <p className="text-sm font-bold text-slate-600 mb-2">
                        Método de entrega
                    </p>
                    <div className="space-y-2">
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
                </Modal>
            )}

            {showManageAddresses && addressModalTarget && (
                <CustomerAddressesModal
                    customerId={addressModalTarget.customerUuid}
                    addresses={addressModalTarget.addresses}
                    onSaved={handleAddressesSaved}
                    onClose={() => setShowManageAddresses(false)}
                    startWithNewAddress={addressModalTarget.addresses.length === 0}
                />
            )}

            {/* MODAL: AVISAR POR WHATSAPP (paquetes sin orden, envío individual por cliente) */}
            {notifyMultiple.isOpen && (
                <NotifyPackagesModal
                    customers={notifyMultiple.customers}
                    isLoading={notifyMultiple.isLoading}
                    sentCustomerIds={notifyMultiple.sentCustomerIds}
                    sendingCustomerId={notifyMultiple.sendingCustomerId}
                    onSend={notifyMultiple.sendToCustomer}
                    onClose={notifyMultiple.close}
                />
            )}
        </div>
    );
};

export default LogisticsContainer;
