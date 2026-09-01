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
import { DateRangeFilter } from '@/components/common/date-range-filter/date-range-filter';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useShipmentOrders, ShipmentOrderPaymentFilter } from './use-shipment-orders';
import { ConsolidationListItem, ConsolidationStatus, ConsolidationPaymentStatus, AvailablePackage } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';

const STATUS_LABELS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
};

const STATUS_COLORS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'bg-amber-50 text-amber-600 border-amber-100',
  CERRADO: 'bg-blue-50 text-blue-600 border-blue-100',
  DESPACHADO: 'bg-violet-50 text-violet-600 border-violet-100',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const PAYMENT_LABELS: Record<ConsolidationPaymentStatus, string> = {
  SIN_ESTIMADO: 'Sin estimado',
  ESTIMADO_PENDIENTE: 'Estimado pendiente',
  PENDIENTE_PAGO: 'Pendiente de pago',
  PAGADO: 'Pagado',
};

const PAYMENT_COLORS: Record<ConsolidationPaymentStatus, string> = {
  SIN_ESTIMADO: 'bg-slate-50 text-slate-400 border-slate-200',
  ESTIMADO_PENDIENTE: 'bg-blue-50 text-blue-600 border-blue-100',
  PENDIENTE_PAGO: 'bg-amber-50 text-amber-600 border-amber-100',
  PAGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const formatCRC = (n: number) => `₡${Math.round(n).toLocaleString('es-CR')}`;

const PAYMENT_FILTERS: { value: ShipmentOrderPaymentFilter; label: string }[] = [
  { value: ShipmentOrderPaymentFilter.PENDIENTE_PAGO, label: 'Pendientes de pago' },
  { value: ShipmentOrderPaymentFilter.SIN_NOTIFICAR, label: 'Sin notificar' },
  { value: ShipmentOrderPaymentFilter.PAGADO, label: 'Pagadas' },
  { value: ShipmentOrderPaymentFilter.ENTREGADO, label: 'Entregadas' },
  { value: ShipmentOrderPaymentFilter.ALL, label: 'Todas' },
];

export const ShipmentOrdersContainer: React.FC = () => {
  const {
    page, setPage,
    search, setSearch,
    paymentFilter, handlePaymentFilterChange,
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
    handleGoToAddressStep,
    createAddresses,
    createAddressId, setCreateAddressId,
    createDeliveryMethod, setCreateDeliveryMethod,
    handleConfirmCreate,
    isLoadingCreateData,
    isCreatingOrder,
    setCreateStep,
  } = useShipmentOrders();
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();
  const activeDeliveryMethods = (deliveryMethodsData?.data ?? []).filter((m) => m.is_active);

  const listColumns: Column<ConsolidationListItem>[] = [
    {
      header: '#ID',
      accessor: '_id',
      render: (row) => (
        <span className="font-mono text-[11px] font-black text-slate-400 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg tracking-widest">
          #{row.uuid.slice(-5).toUpperCase()}
        </span>
      ),
    },
    {
      header: 'Cliente',
      accessor: 'customer_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm leading-none mb-1">{row.customer_name}</span>
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase">{row.customer_code}</span>
          {/* En pantallas angostas (iPad) las columnas Peso/Paquetes/Fecha se ocultan — se resumen aquí */}
          <span className="text-[10px] text-slate-400 mt-1 xl:hidden">
            {Number(row.total_weight_lb).toFixed(2)} lb · {row.package_count} paq. · {new Date(row.created_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Estado',
      accessor: 'status',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[row.status]}`}>
          {STATUS_LABELS[row.status]}
        </span>
      ),
    },
    {
      header: 'Monto',
      accessor: 'display_amount_crc',
      align: 'center',
      render: (row) => (
        row.display_amount_crc != null ? (
          <div className="flex flex-col items-center">
            <span className="font-black text-slate-700 text-sm">{formatCRC(row.display_amount_crc)}</span>
            <span className="text-[9px] text-slate-400 uppercase font-bold">{row.is_billing_amount ? 'Factura' : 'Estimado'}</span>
          </div>
        ) : (
          <span className="text-slate-300 text-xs">—</span>
        )
      ),
    },
    {
      header: 'Pago',
      accessor: 'payment_status',
      render: (row) => (
        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${PAYMENT_COLORS[row.payment_status]}`}>
          {PAYMENT_LABELS[row.payment_status]}
        </span>
      ),
    },
    {
      header: 'Peso',
      accessor: 'total_weight_lb',
      align: 'center',
      className: 'hidden xl:table-cell',
      render: (row) => (
        <span className="font-black text-slate-700 text-sm">
          {Number(row.total_weight_lb).toFixed(2)} <span className="text-[10px] text-slate-400">lb</span>
        </span>
      ),
    },
    {
      header: 'Paquetes',
      accessor: 'package_count',
      align: 'center',
      className: 'hidden xl:table-cell',
      render: (row) => (
        <span className="bg-slate-100 text-slate-600 font-black text-xs px-3 py-1 rounded-full">
          {row.package_count}
        </span>
      ),
    },
    {
      header: 'Fecha',
      accessor: 'created_at',
      className: 'hidden xl:table-cell',
      render: (row) => (
        <span className="text-xs text-slate-400 font-medium">
          {new Date(row.created_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}
        </span>
      ),
    },
    {
      header: '',
      accessor: '_chevron',
      align: 'right',
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
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Fila principal */}
        <div className="flex items-center gap-3 p-4 border-b border-slate-50">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              placeholder="Buscar por cliente, casillero o N° de orden..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 pl-9 pr-4 py-2.5 rounded-xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-sm"
            />
          </div>
          <div className="hidden md:flex flex-shrink-0">
            <DateRangeFilter
              from={dateFrom} to={dateTo}
              onFromChange={setDateFrom} onToChange={setDateTo}
              onClear={() => { setDateFrom(''); setDateTo(''); }}
            />
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl transition-all shadow-lg active:scale-95 flex-shrink-0"
          >
            <Plus size={14} strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-[0.12em] whitespace-nowrap">Nueva Orden</span>
          </button>
        </div>

        {/* Filtros por estado de pago */}
        <div className="px-4 py-2.5 overflow-x-auto">
          <div className="flex gap-1">
            {PAYMENT_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handlePaymentFilterChange(f.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all whitespace-nowrap ${
                  paymentFilter === f.value
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-400 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fechas mobile */}
        <div className="md:hidden px-4 pb-3">
          <DateRangeFilter
            from={dateFrom} to={dateTo}
            onFromChange={setDateFrom} onToChange={setDateTo}
            onClear={() => { setDateFrom(''); setDateTo(''); }}
          />
        </div>
      </div>

      {/* CARDS (mobile) */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoadingList ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-20" />
          ))
        ) : shipmentOrders.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Boxes size={24} className="text-slate-300" />
            </div>
            <p className="font-black text-slate-400 text-sm">Sin órdenes de envío</p>
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest text-center px-8">
              No hay órdenes de envío que coincidan con los filtros
            </p>
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
                {Number(row.total_weight_lb).toFixed(2)} lb · {row.package_count} paquete(s)
              </p>
              {row.display_amount_crc != null && (
                <p className="text-xs font-bold text-slate-600 mt-1">
                  {formatCRC(row.display_amount_crc)}
                  <span className="text-[9px] text-slate-400 uppercase font-bold ml-1">
                    {row.is_billing_amount ? 'Factura' : 'Estimado'}
                  </span>
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${STATUS_COLORS[row.status]}`}>
                {STATUS_LABELS[row.status]}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${PAYMENT_COLORS[row.payment_status]}`}>
                {PAYMENT_LABELS[row.payment_status]}
              </span>
              <span className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}</span>
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
                <p className="font-black text-slate-800 uppercase tracking-wider text-xs">Nueva Orden de Envío</p>
                {createCustomer && createStep !== 'customer' && (
                  <p className="text-[11px] text-slate-400 mt-0.5">{createCustomer.first_name} {createCustomer.last_name}</p>
                )}
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mb-6">
              {createStep === 'customer' && 'Paso 1 de 3 — Elige el cliente'}
              {createStep === 'packages' && 'Paso 2 de 3 — Elige los paquetes a incluir'}
              {createStep === 'address' && 'Paso 3 de 3 — Dirección de entrega y método de envío'}
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
                            {c.package_count} paquete{c.package_count > 1 ? 's' : ''} disponible{c.package_count > 1 ? 's' : ''} · {Number(c.total_weight_lb).toFixed(2)} lb
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
                              {Number(pkg.weight_lb).toFixed(2)} lb · {pkg.package_type} · {pkg.status}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
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
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                  <MapPin size={12} /> Dirección de entrega
                </p>
                {createAddresses.length === 0 ? (
                  <p className="text-slate-400 text-sm py-4 text-center">Este cliente no tiene direcciones registradas.</p>
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
                          <p className="font-bold text-sm">{addr.address_label || 'Dirección'}{addr.is_default ? ' · Default' : ''}</p>
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
                    onClick={handleConfirmCreate}
                    disabled={!createAddressId || !createDeliveryMethod || isCreatingOrder}
                    className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
                  >
                    {isCreatingOrder ? 'Creando...' : 'Crear Orden de Envío'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ShipmentOrdersContainer;
