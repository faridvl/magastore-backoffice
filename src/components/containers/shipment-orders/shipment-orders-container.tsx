import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Loader2,
  Plus,
  MapPin,
  CheckCircle,
  CheckSquare,
  Square,
} from 'lucide-react';
import { DateRangeFilter, formatPeriodLabel } from '@/components/common/date-range-filter/date-range-filter';
import { FilterBar, FilterBarField } from '@/components/common/filter-bar/filter-bar';
import { formatCrc } from '@/shared/utils/format-crc';
import { formatBusinessDate } from '@/shared/utils/timezone';
import { packageStatusLabel, packageTypeLabel } from '@/shared/constants/package-labels';
import { Badge } from '@/components/common/badge/badge';
import { Modal } from '@/components/common/modal/modal';
import { Button, ButtonVariant } from '@/components/common/button/button';
import {
  ORDER_STEP_LABEL,
  ORDER_STEP_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  getPaymentStatus,
} from '@/shared/constants/status-labels';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import {
  useShipmentOrders,
  ShipmentOrderStepFilter,
  ShipmentOrderPaidFilter,
  ShipmentOrderNotifiedFilter,
} from './use-shipment-orders';
import { ConsolidationListItem, ConsolidationStatus, ConsolidationPaymentStatus, ShipmentOrderStep, AvailablePackage } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { CustomerAddressesModal } from '@/components/containers/customers/customer-detail/customer-addresses-modal';
import { CustomerRecipientsList } from '@/components/containers/customers/customer-recipients/customer-recipients-list';

// Un estimado que aún no se avisó al cliente cuenta como "Sin estimado" (regla única en getPaymentStatus).
const getRowPaymentStatus = (row: ConsolidationListItem): ConsolidationPaymentStatus =>
  getPaymentStatus({
    isBilled:
      row.payment_status === ConsolidationPaymentStatus.PAGADO ||
      row.payment_status === ConsolidationPaymentStatus.PENDIENTE_PAGO,
    isPaid: row.payment_status === ConsolidationPaymentStatus.PAGADO,
    hasPreBilling: row.payment_status !== ConsolidationPaymentStatus.SIN_ESTIMADO,
    preBillingNotifiedAt: row.pre_billing_notified_at,
  });

const LOAD_ERROR_TITLE = 'No se pudo cargar. Revisa tu conexión.';

// Origen del monto, sin repetir el estado de pago (eso lo dice la columna Pago).
const getAmountSourceLabel = (row: ConsolidationListItem): string => (row.is_billing_amount ? 'Factura' : 'Estimado');

// Con "Sin estimado" no se muestra monto aunque exista un borrador: Monto y Pago usan el mismo criterio.
const AmountCell: React.FC<{ row: ConsolidationListItem; align?: 'start' | 'center' }> = ({ row, align = 'start' }) =>
  row.display_amount_crc != null && getRowPaymentStatus(row) !== ConsolidationPaymentStatus.SIN_ESTIMADO ? (
    <div className={`flex flex-col ${align === 'center' ? 'items-center' : 'items-start'}`}>
      <span className="font-black text-slate-700 text-sm whitespace-nowrap">{formatCRC(row.display_amount_crc)}</span>
      <span className="text-xs text-slate-500 font-semibold">{getAmountSourceLabel(row)}</span>
    </div>
  ) : (
    <span className="text-slate-400 text-sm">—</span>
  );

const formatCRC = formatCrc;

const STEP_FILTERS: { value: ShipmentOrderStepFilter; label: string }[] = [
  { value: ShipmentOrderStepFilter.CONFIRMACION, label: 'Confirmación' },
  { value: ShipmentOrderStepFilter.COBRO, label: 'Cobro' },
  { value: ShipmentOrderStepFilter.DESPACHO, label: 'Despacho' },
  { value: ShipmentOrderStepFilter.NOTIFICACION, label: 'Cierre' },
  { value: ShipmentOrderStepFilter.FINALIZADA, label: 'Finalizadas' },
  { value: ShipmentOrderStepFilter.SEGUIMIENTO_PENDIENTE, label: 'Seguimiento pendiente' },
];

const PAID_FILTER_LABEL = 'Pago';

// Los cuatro nombres del badge de pago, en el orden del flujo.
const PAID_FILTERS: { value: ShipmentOrderPaidFilter; label: string }[] = [
  { value: ShipmentOrderPaidFilter.SIN_ESTIMADO, label: PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.SIN_ESTIMADO] },
  { value: ShipmentOrderPaidFilter.ESTIMADO_ENVIADO, label: PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.ESTIMADO_PENDIENTE] },
  { value: ShipmentOrderPaidFilter.POR_COBRAR, label: PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PENDIENTE_PAGO] },
  { value: ShipmentOrderPaidFilter.PAGADA, label: PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PAGADO] },
];

// Avisada = se le mandó el estimado o el aviso del paso 3; es el mismo criterio de "Cobros" del Operativo.
const NOTIFIED_FILTER_LABEL = 'Aviso de cobro';

const NOTIFIED_FILTERS: { value: ShipmentOrderNotifiedFilter; label: string }[] = [
  { value: ShipmentOrderNotifiedFilter.NOTIFICADA, label: 'Avisada' },
  { value: ShipmentOrderNotifiedFilter.SIN_NOTIFICAR, label: 'Sin avisar' },
];

export const ShipmentOrdersContainer: React.FC = () => {
  const {
    page, setPage,
    search, setSearch,
    stepFilters, handleStepFiltersChange,
    paidFilter, handlePaidFilterChange,
    notifiedFilter, handleNotifiedFilterChange,
    clearDates,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    shipmentOrders, listMeta, isLoadingList, isErrorList, handleRetryList,

    handleSelectRow,

    deleteUuid, setDeleteUuid,
    handleConfirmDelete,
    isDeleting,

    createStep,
    openCreateModal,
    closeCreateModal,
    createCustomers,
    createCustomer,
    handleSelectCreateCustomer,
    createPackages,
    createSelectedPackageUuids,
    toggleCreatePackage,
    toggleAllCreatePackages,
    handleGoToAddressStep,
    createAddresses,
    createAddressId, setCreateAddressId,
    showCreateAddressesModal, setShowCreateAddressesModal,
    handleCreateAddressesSaved,
    createDeliveryMethod, setCreateDeliveryMethod,
    createRecipientId, setCreateRecipientId,
    handleConfirmCreate,
    isLoadingCreateData,
    isCreatingOrder,
    setCreateStep,
  } = useShipmentOrders();
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
  const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);
  const isCreatePickup = !!activeDeliveryMethods.find((m) => m.code === createDeliveryMethod)?.is_pickup;

  const hasActiveFilters =
    stepFilters.length > 0 ||
    paidFilter !== ShipmentOrderPaidFilter.ALL ||
    notifiedFilter !== ShipmentOrderNotifiedFilter.ALL ||
    !!dateFrom ||
    !!dateTo ||
    search.trim() !== '';
  const clearAllFilters = () => {
    handleStepFiltersChange([]);
    handlePaidFilterChange(ShipmentOrderPaidFilter.ALL);
    handleNotifiedFilterChange(ShipmentOrderNotifiedFilter.ALL);
    setSearch('');
    clearDates();
  };

  const filterFields: FilterBarField[] = [
    {
      key: 'step',
      label: 'Paso',
      emptyLabel: 'Todos los pasos',
      options: STEP_FILTERS,
      values: stepFilters,
      onValuesChange: (values) => handleStepFiltersChange(values as ShipmentOrderStepFilter[]),
    },
    {
      key: 'paid',
      label: PAID_FILTER_LABEL,
      chipPrefix: PAID_FILTER_LABEL,
      emptyLabel: 'Todas',
      options: PAID_FILTERS,
      value: paidFilter === ShipmentOrderPaidFilter.ALL ? null : paidFilter,
      onChange: (value) => handlePaidFilterChange((value as ShipmentOrderPaidFilter | null) ?? ShipmentOrderPaidFilter.ALL),
    },
    {
      key: 'notified',
      label: NOTIFIED_FILTER_LABEL,
      chipPrefix: NOTIFIED_FILTER_LABEL,
      emptyLabel: 'Todas',
      options: NOTIFIED_FILTERS,
      value: notifiedFilter === ShipmentOrderNotifiedFilter.ALL ? null : notifiedFilter,
      onChange: (value) => handleNotifiedFilterChange((value as ShipmentOrderNotifiedFilter | null) ?? ShipmentOrderNotifiedFilter.ALL),
    },
  ];

  const areAllCreatePackagesSelected =
    createPackages.length > 0 && createSelectedPackageUuids.length === createPackages.length;

  const renderCreateFooter = () => {
    if (createStep === 'customer') {
      return <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={closeCreateModal} className="w-full" />;
    }
    if (createStep === 'packages') {
      return (
        <div className="flex gap-3">
          <Button variant={ButtonVariant.CANCEL} onClick={() => setCreateStep('customer')} className="flex-1">
            <ChevronLeft size={16} /> Atrás
          </Button>
          <Button
            variant={ButtonVariant.PRIMARY}
            text={`Continuar${createSelectedPackageUuids.length > 0 ? ` (${createSelectedPackageUuids.length})` : ''}`}
            onClick={handleGoToAddressStep}
            disabled={createSelectedPackageUuids.length === 0}
            className="flex-1"
          />
        </div>
      );
    }
    return (
      <div className="flex gap-3">
        <Button variant={ButtonVariant.CANCEL} onClick={() => setCreateStep('packages')} className="flex-1">
          <ChevronLeft size={16} /> Atrás
        </Button>
        <Button
          variant={ButtonVariant.PRIMARY}
          text={isCreatingOrder ? 'Creando…' : 'Crear orden'}
          onClick={() => handleConfirmCreate(isCreatePickup)}
          disabled={(!createAddressId && !isCreatePickup) || !createDeliveryMethod || isCreatingOrder}
          className="flex-1"
        />
      </div>
    );
  };

  const listColumns: Column<ConsolidationListItem>[] = [
    {
      header: 'Cliente',
      accessor: 'customer_name',
      minWidth: 220,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm break-words">{row.customer_name}</span>
          <span className="text-xs font-mono font-bold text-amber-600">{row.customer_code}</span>
          {/* Bajo 2xl las columnas Peso/Paquetes/Fecha se ocultan: se resumen aquí */}
          <span className="text-xs text-slate-500 mt-1 2xl:hidden">
            {formatWeight(row.total_weight_lb)} · {formatCount(row.package_count, 'paquete', 'paquetes')} · {formatBusinessDate(row.created_at)}
          </span>
        </div>
      ),
    },
    {
      // El paso manda sobre el status logístico crudo para el operador: le
      // dice en qué punto del wizard está la orden, no solo su status en la
      // máquina de estados interna.
      header: 'Paso',
      accessor: 'current_step',
      noWrap: true,
      render: (row) => (
        <Badge tone={ORDER_STEP_TONE[row.current_step]}>{ORDER_STEP_LABEL[row.current_step]}</Badge>
      ),
    },
    {
      header: 'Monto',
      accessor: 'display_amount_crc',
      align: 'center',
      noWrap: true,
      render: (row) => <AmountCell row={row} align="center" />,
    },
    {
      header: 'Pago',
      accessor: 'payment_status',
      noWrap: true,
      render: (row) => (
        <Badge tone={PAYMENT_STATUS_TONE[getRowPaymentStatus(row)]}>
          {PAYMENT_STATUS_LABEL[getRowPaymentStatus(row)]}
        </Badge>
      ),
    },
    {
      header: 'Peso',
      accessor: 'total_weight_lb',
      align: 'center',
      className: 'hidden 2xl:table-cell',
      noWrap: true,
      render: (row) => (
        <span className="font-black text-slate-700 text-sm">
          {formatWeight(row.total_weight_lb)}
        </span>
      ),
    },
    {
      header: 'Paquetes',
      accessor: 'package_count',
      align: 'center',
      className: 'hidden 2xl:table-cell',
      noWrap: true,
      render: (row) => (
        <span className="bg-slate-100 text-slate-600 font-black text-xs px-3 py-1 rounded-full">
          {row.package_count}
        </span>
      ),
    },
    {
      header: 'Fecha',
      accessor: 'created_at',
      className: 'hidden 2xl:table-cell',
      noWrap: true,
      render: (row) => (
        <span className="text-xs text-slate-500 font-medium">
          {formatBusinessDate(row.created_at)}
        </span>
      ),
    },
    {
      header: '',
      accessor: '_chevron',
      align: 'right',
      className: 'w-px',
      noWrap: true,
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {row.status === ConsolidationStatus.ABIERTO && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteUuid(row.uuid); }}
              aria-label="Eliminar orden de envío"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar orden de envío"
            >
              <Trash2 size={16} />
            </button>
          )}
          <ChevronRight size={16} className="text-slate-300" />
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

      {/* TOOLBAR */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4">
        <FilterBar
          leading={
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar cliente, casillero u orden"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 pl-10 pr-4 rounded-full border border-slate-100 outline-none focus:ring-2 focus:ring-slate-200 text-base"
              />
            </div>
          }
          trailing={
            <Button variant={ButtonVariant.PRIMARY} onClick={openCreateModal} className="flex-1 sm:flex-none">
              <Plus size={16} strokeWidth={2.5} />
              Nueva orden
            </Button>
          }
          fields={filterFields}
          extraPanelContent={
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-bold text-slate-900">Fecha de creación</span>
              <DateRangeFilter
                inline
                from={dateFrom} to={dateTo}
                onFromChange={setDateFrom} onToChange={setDateTo}
                onClear={clearDates}
              />
            </div>
          }
          extraActiveCount={dateFrom || dateTo ? 1 : 0}
          extraChips={dateFrom || dateTo ? [{ key: 'period', label: `Creadas ${formatPeriodLabel(dateFrom, dateTo)}`, onRemove: clearDates }] : []}
          onClearExtra={clearDates}
          resultCount={isLoadingList ? undefined : listMeta.total}
        />
      </div>

      {/* TARJETAS (celular, iPad vertical y horizontal con el menú abierto) */}
      <div className="flex flex-col gap-3 xl:hidden">
        {isErrorList ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
            <EmptyState title={LOAD_ERROR_TITLE} actionLabel="Reintentar" onAction={handleRetryList} />
          </div>
        ) : isLoadingList ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-36" />
            ))}
          </div>
        ) : shipmentOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
            <EmptyState
              title={hasActiveFilters ? 'No hay órdenes con esos filtros' : 'Aún no hay órdenes'}
              actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {shipmentOrders.map((row) => (
              <button
                key={row.uuid}
                onClick={() => handleSelectRow(row)}
                className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex flex-col gap-3 hover:border-amber-100 transition-all active:scale-[0.99]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 text-sm break-words">{row.customer_name}</p>
                    <p className="text-xs font-mono font-bold text-amber-600 mt-0.5">{row.customer_code}</p>
                  </div>
                  <Badge tone={ORDER_STEP_TONE[row.current_step]}>{ORDER_STEP_LABEL[row.current_step]}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  {formatWeight(row.total_weight_lb)} · {formatCount(row.package_count, 'paquete', 'paquetes')} · {formatBusinessDate(row.created_at)}
                </p>
                <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
                  <AmountCell row={row} />
                  <Badge tone={PAYMENT_STATUS_TONE[getRowPaymentStatus(row)]}>
                    {PAYMENT_STATUS_LABEL[getRowPaymentStatus(row)]}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        )}
        {!isErrorList && listMeta.totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 px-2 pt-2">
            <Button
              variant={ButtonVariant.CANCEL}
              text="Anterior"
              onClick={() => setPage(Math.max(1, listMeta.page - 1))}
              disabled={listMeta.page === 1}
            />
            <span className="text-sm text-slate-500 font-bold">{listMeta.page} / {listMeta.totalPages}</span>
            <Button
              variant={ButtonVariant.CANCEL}
              text="Siguiente"
              onClick={() => setPage(Math.min(listMeta.totalPages, listMeta.page + 1))}
              disabled={listMeta.page === listMeta.totalPages}
            />
          </div>
        )}
      </div>

      {/* TABLA (desde xl: con el menú abierto ya cabe sin scroll lateral) */}
      <div className="hidden xl:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        {isErrorList ? (
          <EmptyState title={LOAD_ERROR_TITLE} actionLabel="Reintentar" onAction={handleRetryList} />
        ) : isLoadingList ? (
          <div className="space-y-3 p-6" aria-busy="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : (
        <NewTable
          data={shipmentOrders}
          columns={listColumns}
          isLoading={isLoadingList}
          totalRows={listMeta.total}
          currentPage={listMeta.page}
          totalPages={listMeta.totalPages}
          onPageChange={setPage}
          onRowClick={handleSelectRow}
          itemsPerPage={10}
          itemSingular="orden"
          itemPlural="órdenes"
          emptyTitle={hasActiveFilters ? 'No hay órdenes con esos filtros' : 'Aún no hay órdenes'}
          emptyActionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
          onEmptyAction={hasActiveFilters ? clearAllFilters : undefined}
        />
        )}
      </div>

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {deleteUuid && (
        <Modal
          title="¿Eliminar orden de envío?"
          onClose={() => setDeleteUuid(null)}
          className="sm:max-w-sm"
          footer={
            <div className="flex gap-3">
              <Button variant={ButtonVariant.CANCEL} text="Cancelar" onClick={() => setDeleteUuid(null)} disabled={isDeleting} className="flex-1" />
              <Button variant={ButtonVariant.DANGER} onClick={handleConfirmDelete} disabled={isDeleting} className="flex-1">
                {isDeleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                {isDeleting ? 'Eliminando…' : 'Eliminar'}
              </Button>
            </div>
          }
        >
          <p className="text-sm leading-relaxed text-slate-500">
            Los paquetes asignados quedarán disponibles nuevamente. Esta acción no se puede deshacer.
          </p>
        </Modal>
      )}

      {/* MODAL: NUEVA ORDEN (cliente → paquetes → dirección/método, mismo flujo que Paquetes) */}
      {createStep && (
        <Modal
          title="Nueva orden de envío"
          subtitle={
            <>
              {createStep === 'customer' && 'Paso 1 de 3: elige el cliente'}
              {createStep === 'packages' && 'Paso 2 de 3: elige los paquetes'}
              {createStep === 'address' && 'Paso 3 de 3: dirección y método de entrega'}
              {createCustomer && createStep !== 'customer' && (
                <span className="mt-0.5 block font-semibold text-slate-700">{createCustomer.first_name} {createCustomer.last_name}</span>
              )}
            </>
          }
          onClose={closeCreateModal}
          closeOnOverlayClick={false}
          footer={isLoadingCreateData ? undefined : renderCreateFooter()}
        >
          {isLoadingCreateData ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
            </div>
          ) : createStep === 'customer' ? (
            createCustomers.length === 0 ? (
              <div>
                <EmptyState title="No hay clientes con paquetes disponibles" className="pb-2 pt-6" />
                <p className="pb-4 text-center text-xs text-slate-500">Los paquetes que ya están en una orden no aparecen aquí.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {createCustomers.map((c) => (
                  <button
                    key={c.customer_id}
                    onClick={() => handleSelectCreateCustomer(c)}
                    className="w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all border bg-slate-50 border-transparent hover:border-slate-200"
                  >
                    <div className="min-w-0">
                      <p className="font-bold text-sm text-slate-800 break-words">{c.first_name} {c.last_name}</p>
                      <p className="text-xs text-slate-500">
                        {formatCount(c.package_count, 'paquete disponible', 'paquetes disponibles')} · {formatWeight(c.total_weight_lb)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )
          ) : createStep === 'packages' ? (
            createPackages.length === 0 ? (
              <EmptyState title="Este cliente no tiene paquetes disponibles" className="py-8" />
            ) : (
              <>
                <button
                  onClick={toggleAllCreatePackages}
                  className="w-full min-h-[44px] flex items-center gap-3 px-4 mb-2 rounded-2xl text-left transition-all hover:bg-slate-50"
                >
                  {areAllCreatePackagesSelected
                    ? <CheckSquare size={18} className="text-amber-600 flex-shrink-0" />
                    : <Square size={18} className="text-slate-300 flex-shrink-0" />
                  }
                  <span className="text-sm font-semibold text-slate-600">
                    {areAllCreatePackagesSelected ? 'Quitar todos' : `Seleccionar todos (${createPackages.length})`}
                  </span>
                </button>
                <div className="space-y-2">
                  {createPackages.map((pkg: AvailablePackage) => {
                    const selected = createSelectedPackageUuids.includes(pkg.uuid);
                    return (
                      <button
                        key={pkg.uuid}
                        onClick={() => toggleCreatePackage(pkg.uuid)}
                        className={`w-full min-h-[44px] flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${
                          selected
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-slate-50 border-transparent hover:border-slate-200'
                        }`}
                      >
                        {selected
                          ? <CheckSquare size={18} className="text-amber-600 flex-shrink-0" />
                          : <Square size={18} className="text-slate-300 flex-shrink-0" />
                        }
                        <div className="flex-1 min-w-0">
                          <p className="font-mono text-sm font-bold text-slate-800 [overflow-wrap:anywhere]">
                            {pkg.tracking_number}{pkg.store_name ? ` — ${pkg.store_name}` : ''}
                          </p>
                          <p className="text-xs text-slate-500">
                            {formatWeight(pkg.weight_lb)} · {packageTypeLabel(pkg.package_type)} · {packageStatusLabel(pkg.status)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </>
            )
          ) : (
            <>
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                  <MapPin size={14} /> Dirección de entrega
                </p>
                {/* Alta de direcciones sin salir del asistente: si el cliente
                    no tiene ninguna, la orden no se puede crear y antes había
                    que cancelar e ir a la ficha del cliente. */}
                <button
                  onClick={() => setShowCreateAddressesModal(true)}
                  className="inline-flex min-h-[44px] items-center gap-1.5 px-1 text-sm font-semibold text-teal-700 underline underline-offset-4 hover:text-teal-800"
                >
                  <Plus size={14} />
                  {createAddresses.length === 0 ? 'Agregar' : 'Gestionar'}
                </button>
              </div>
              {isCreatePickup ? (
                <p className="text-slate-500 text-sm py-3 mb-4">No hace falta: el cliente retira en oficina.</p>
              ) : createAddresses.length === 0 ? (
                <p className="text-slate-500 text-sm py-3 mb-4">Este cliente no tiene direcciones. Agrega una, o elige retiro en oficina.</p>
              ) : (
                <div className="space-y-2 mb-6">
                  {createAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      onClick={() => setCreateAddressId(addr.id)}
                      className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${
                        createAddressId === addr.id
                          ? 'bg-slate-900 text-white border-slate-900'
                          : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Principal' : ''}</p>
                        <p className={`text-xs mt-0.5 break-words ${createAddressId === addr.id ? 'text-slate-300' : 'text-slate-500'}`}>
                          {addr.exact_address}, {addr.district}, {addr.canton}, {addr.province}
                        </p>
                      </div>
                      {createAddressId === addr.id && (
                        <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}

              {!isCreatePickup && createCustomer && (
                <div className="mb-6">
                  <p className="text-sm font-bold text-slate-700 mb-2">¿Quién recibe?</p>
                  <CustomerRecipientsList
                    customerId={createCustomer.customer_id}
                    customerName={`${createCustomer.first_name} ${createCustomer.last_name}`}
                    selectedId={createRecipientId}
                    onSelect={setCreateRecipientId}
                  />
                </div>
              )}

              <p className="text-sm font-bold text-slate-700 mb-2">Método de entrega</p>
              <div className="space-y-2">
                {activeDeliveryMethods.map((dm) => (
                  <button
                    key={dm.code}
                    onClick={() => setCreateDeliveryMethod(dm.code)}
                    className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${
                      createDeliveryMethod === dm.code
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm">{dm.name}</span>
                    {createDeliveryMethod === dm.code && (
                      <CheckCircle size={16} className="text-amber-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </>
          )}
        </Modal>
      )}

      {/* Direcciones del cliente, anidado sobre el asistente. */}
      {showCreateAddressesModal && createCustomer && (
        <CustomerAddressesModal
          customerId={createCustomer.customer_id}
          addresses={createAddresses}
          onSaved={handleCreateAddressesSaved}
          onClose={() => setShowCreateAddressesModal(false)}
          startWithNewAddress={createAddresses.length === 0}
        />
      )}
    </div>
  );
};

export default ShipmentOrdersContainer;
