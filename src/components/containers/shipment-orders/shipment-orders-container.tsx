import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import {
  Search,
  ChevronRight,
  ChevronLeft,
  Boxes,
  Trash2,
  Loader2,
  Plus,
  Package,
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

const getAmountKindLabel = (row: ConsolidationListItem): string => {
  if (row.is_billing_amount) return 'Factura';
  return row.pre_billing_notified_at ? 'Estimado' : 'Estimado sin enviar';
};

const formatCRC = formatCrc;

const STEP_FILTERS: { value: ShipmentOrderStepFilter; label: string }[] = [
  { value: ShipmentOrderStepFilter.CONFIRMACION, label: 'Confirmación' },
  { value: ShipmentOrderStepFilter.COBRO, label: 'Cobro' },
  { value: ShipmentOrderStepFilter.DESPACHO, label: 'Despacho' },
  { value: ShipmentOrderStepFilter.NOTIFICACION, label: 'Cierre' },
  { value: ShipmentOrderStepFilter.FINALIZADA, label: 'Finalizadas' },
  { value: ShipmentOrderStepFilter.SEGUIMIENTO_PENDIENTE, label: 'Seguimiento pendiente' },
];

const PAID_FILTERS: { value: ShipmentOrderPaidFilter; label: string }[] = [
  { value: ShipmentOrderPaidFilter.PAGADA, label: 'Pagadas' },
  { value: ShipmentOrderPaidFilter.SIN_PAGAR, label: 'Sin pagar (con estimados)' },
  { value: ShipmentOrderPaidFilter.FACTURADA_SIN_PAGAR, label: 'Con factura sin pagar' },
];

const NOTIFIED_FILTERS: { value: ShipmentOrderNotifiedFilter; label: string }[] = [
  { value: ShipmentOrderNotifiedFilter.NOTIFICADA, label: 'Estimado enviado' },
  { value: ShipmentOrderNotifiedFilter.SIN_NOTIFICAR, label: 'Estimado sin enviar' },
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
    shipmentOrders, listMeta, isLoadingList,

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
      label: 'Pago',
      emptyLabel: 'Todas',
      options: PAID_FILTERS,
      value: paidFilter === ShipmentOrderPaidFilter.ALL ? null : paidFilter,
      onChange: (value) => handlePaidFilterChange((value as ShipmentOrderPaidFilter | null) ?? ShipmentOrderPaidFilter.ALL),
    },
    {
      key: 'notified',
      label: 'Estimado al cliente',
      emptyLabel: 'Todas',
      options: NOTIFIED_FILTERS,
      value: notifiedFilter === ShipmentOrderNotifiedFilter.ALL ? null : notifiedFilter,
      onChange: (value) => handleNotifiedFilterChange((value as ShipmentOrderNotifiedFilter | null) ?? ShipmentOrderNotifiedFilter.ALL),
    },
  ];

  const listColumns: Column<ConsolidationListItem>[] = [
    {
      header: '#ID',
      accessor: '_id',
      className: 'hidden 2xl:table-cell',
      render: (row) => (
        <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg tracking-widest">
          #{row.uuid.slice(-5).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Cliente',
      accessor: 'customer_name',
      minWidth: 220,
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm leading-none mb-1">{row.customer_name}</span>
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">{row.customer_code}</span>
          {/* En pantallas angostas (iPad) las columnas Peso/Paquetes/Fecha se ocultan — se resumen aquí */}
          <span className="text-[10px] text-slate-400 mt-1 2xl:hidden">
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
      render: (row) => (
        row.display_amount_crc != null ? (
          <div className="flex flex-col items-center">
            <span className="font-black text-slate-700 text-sm whitespace-nowrap">{formatCRC(row.display_amount_crc)}</span>
            <span className="text-xs text-slate-500 font-semibold text-center">{getAmountKindLabel(row)}</span>
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )
      ),
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
        <span className="text-xs text-slate-400 font-medium">
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
              className="p-2.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
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
            <button
              onClick={openCreateModal}
              className="flex flex-1 sm:flex-none items-center justify-center gap-2 min-h-[44px] px-5 rounded-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold transition-colors"
            >
              <Plus size={16} strokeWidth={2.5} />
              Nueva orden
            </button>
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

      {/* CARDS (mobile) */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoadingList ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-20" />
          ))
        ) : shipmentOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
            <EmptyState
              title={hasActiveFilters ? 'No hay órdenes con esos filtros' : 'Aún no hay órdenes'}
              actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
              onAction={hasActiveFilters ? clearAllFilters : undefined}
            />
          </div>
        ) : shipmentOrders.map((row) => (
          <button
            key={row.uuid}
            onClick={() => handleSelectRow(row)}
            className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex items-center justify-between gap-3 hover:border-amber-100 transition-all active:scale-[0.99]"
          >
            <div className="flex-1 min-w-0">
              {/* Mismo identificador que la columna de la tabla en escritorio:
                  es como se referencia la orden al buscarla o al consultarla. */}
              <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                #{row.uuid.slice(-5).toUpperCase()}
              </p>
              <p className="font-bold text-slate-800 text-sm truncate">{row.customer_name}</p>
              <p className="text-[10px] font-mono font-bold text-amber-400 uppercase mt-0.5">{row.customer_code}</p>
              <p className="text-xs text-slate-400 mt-1">
                {formatWeight(row.total_weight_lb)} · {formatCount(row.package_count, 'paquete', 'paquetes')}
              </p>
              {row.display_amount_crc != null && (
                <p className="text-xs font-bold text-slate-600 mt-1">
                  {formatCRC(row.display_amount_crc)}
                  <span className="text-xs text-slate-500 font-semibold block">
                    {getAmountKindLabel(row)}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <Badge tone={ORDER_STEP_TONE[row.current_step]}>{ORDER_STEP_LABEL[row.current_step]}</Badge>
              <Badge tone={PAYMENT_STATUS_TONE[getRowPaymentStatus(row)]}>
                {PAYMENT_STATUS_LABEL[getRowPaymentStatus(row)]}
              </Badge>
              <span className="text-[10px] text-slate-400">{formatBusinessDate(row.created_at)}</span>
            </div>
          </button>
        ))}
        {listMeta.totalPages > 1 && (
          <div className="flex items-center justify-between px-2 pt-2">
            <button
              onClick={() => setPage(Math.max(1, listMeta.page - 1))}
              disabled={listMeta.page === 1}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="text-xs text-slate-400 font-bold">{listMeta.page} / {listMeta.totalPages}</span>
            <button
              onClick={() => setPage(Math.min(listMeta.totalPages, listMeta.page + 1))}
              disabled={listMeta.page === listMeta.totalPages}
              className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40"
            >
              Siguiente
            </button>
          </div>
        )}
      </div>

      {/* TABLE (tablet+) */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
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
      </div>

      {/* MODAL: CONFIRMAR ELIMINACIÓN */}
      {deleteUuid && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setDeleteUuid(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="p-2.5 bg-red-50 rounded-xl flex-shrink-0">
                <Trash2 size={18} className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">¿Eliminar orden de envío?</p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  Los paquetes asignados quedarán disponibles nuevamente. Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteUuid(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NUEVA ORDEN (cliente → paquetes → dirección/método, mismo flujo que Logística) */}
      {createStep && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeCreateModal}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Boxes size={18} className="text-slate-600" />
              </div>
              <div>
                <p className="font-bold text-slate-900 text-base">Nueva orden de envío</p>
                {createCustomer && createStep !== 'customer' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{createCustomer.first_name} {createCustomer.last_name}</p>
                )}
              </div>
            </div>
            <p className="text-sm text-slate-500 mb-6">
              {createStep === 'customer' && 'Paso 1 de 3: elige el cliente'}
              {createStep === 'packages' && 'Paso 2 de 3: elige los paquetes'}
              {createStep === 'address' && 'Paso 3 de 3: dirección y método de envío'}
            </p>

            {isLoadingCreateData ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : createStep === 'customer' ? (
              <>
                {createCustomers.length === 0 ? (
                  <div className="text-center py-8">
                    <Package size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">No hay clientes con paquetes disponibles sin orden de envío.</p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto space-y-2 mb-6">
                    {createCustomers.map((c) => (
                      <button
                        key={c.customer_id}
                        onClick={() => handleSelectCreateCustomer(c)}
                        className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border bg-slate-50 border-transparent hover:border-slate-200"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-sm text-slate-800 truncate">{c.first_name} {c.last_name}</p>
                          <p className="text-[11px] text-slate-400">
                            {formatCount(c.package_count, 'paquete disponible', 'paquetes disponibles')} · {formatWeight(c.total_weight_lb)}
                          </p>
                        </div>
                        <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={closeCreateModal}
                  className="w-full py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
              </>
            ) : createStep === 'packages' ? (
              <>
                {createPackages.length === 0 ? (
                  <div className="text-center py-8">
                    <Package size={32} className="text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm">Este cliente ya no tiene paquetes disponibles.</p>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const allSelected =
                        createPackages.length > 0 &&
                        createSelectedPackageUuids.length === createPackages.length;
                      return (
                        <button
                          onClick={toggleAllCreatePackages}
                          className="w-full flex items-center gap-3 px-4 py-2.5 mb-2 rounded-2xl text-left transition-all hover:bg-slate-50"
                        >
                          {allSelected
                            ? <CheckSquare size={18} className="text-amber-600 flex-shrink-0" />
                            : <Square size={18} className="text-slate-300 flex-shrink-0" />
                          }
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {allSelected ? 'Quitar todos' : `Seleccionar todos (${createPackages.length})`}
                          </span>
                        </button>
                      );
                    })()}
                  <div className="max-h-72 overflow-y-auto space-y-2 mb-6">
                    {createPackages.map((pkg: AvailablePackage) => {
                      const selected = createSelectedPackageUuids.includes(pkg.uuid);
                      return (
                        <button
                          key={pkg.uuid}
                          onClick={() => toggleCreatePackage(pkg.uuid)}
                          className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border ${
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
                            <p className="font-mono text-sm font-bold text-slate-800 truncate" title={pkg.tracking_number}>
                              {pkg.tracking_number}{pkg.store_name ? ` — ${pkg.store_name}` : ''}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {formatWeight(pkg.weight_lb)} · {packageTypeLabel(pkg.package_type)} · {packageStatusLabel(pkg.status)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  </>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCreateStep('customer')}
                    className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft size={14} /> Atrás
                  </button>
                  <button
                    onClick={handleGoToAddressStep}
                    disabled={createSelectedPackageUuids.length === 0}
                    className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
                  >
                    Continuar {createSelectedPackageUuids.length > 0 ? `(${createSelectedPackageUuids.length})` : ''}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <MapPin size={12} /> Dirección de entrega
                  </p>
                  {/* Alta de direcciones sin salir del asistente: si el cliente
                      no tiene ninguna, la orden no se puede crear y antes había
                      que cancelar e ir a la ficha del cliente. */}
                  <button
                    onClick={() => setShowCreateAddressesModal(true)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 text-slate-600 rounded-xl font-bold text-[10px] hover:bg-slate-100 transition-all"
                  >
                    <Plus size={11} />
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
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                          createAddressId === addr.id
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                        }`}
                      >
                        <div>
                          <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Principal' : ''}</p>
                          <p className={`text-[11px] mt-0.5 ${createAddressId === addr.id ? 'text-slate-300' : 'text-slate-400'}`}>
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
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">¿Quién recibe?</p>
                    <CustomerRecipientsList
                      customerId={createCustomer.customer_id}
                      customerName={`${createCustomer.first_name} ${createCustomer.last_name}`}
                      selectedId={createRecipientId}
                      onSelect={setCreateRecipientId}
                    />
                  </div>
                )}

                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                  Método de envío
                </p>
                <div className="space-y-2 mb-6">
                  {activeDeliveryMethods.map((dm) => (
                    <button
                      key={dm.code}
                      onClick={() => setCreateDeliveryMethod(dm.code)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
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

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setCreateStep('packages')}
                    className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5"
                  >
                    <ChevronLeft size={14} /> Atrás
                  </button>
                  <button
                    onClick={() => handleConfirmCreate(isCreatePickup)}
                    disabled={(!createAddressId && !isCreatePickup) || !createDeliveryMethod || isCreatingOrder}
                    className="py-3.5 px-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
                  >
                    {isCreatingOrder ? 'Creando…' : 'Crear orden'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Direcciones del cliente, anidado sobre el asistente. z-[70] porque el
          asistente ya ocupa z-50. */}
      {showCreateAddressesModal && createCustomer && (
        <CustomerAddressesModal
          customerId={createCustomer.customer_id}
          addresses={createAddresses}
          onSaved={handleCreateAddressesSaved}
          onClose={() => setShowCreateAddressesModal(false)}
          zIndexClassName="z-[70]"
          startWithNewAddress={createAddresses.length === 0}
        />
      )}
    </div>
  );
};

export default ShipmentOrdersContainer;
