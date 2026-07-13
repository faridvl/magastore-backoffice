import React from 'react';
import {
  Search,
  Plus,
  Package,
  ChevronRight,
  X,
  CheckSquare,
  Square,
  Boxes,
  ArrowRight,
  FileText,
  CheckCircle,
  Download,
  AlertTriangle,
  Trash2,
  Loader2,
  RotateCcw,
  SendHorizonal,
} from 'lucide-react';
import { DateRangeFilter } from '@/components/common/date-range-filter/date-range-filter';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useShipmentOrders, ShipmentOrderStatusFilter } from './use-shipment-orders';
import {
  ConsolidationListItem,
  ConsolidationDetail,
  ConsolidationStatus,
  ConsolidationPackage,
  AvailablePackage,
  DeliveryMethod,
} from '@/types/logistics/logistics.types';
import { Customer } from '@/types/customer/customer.types';

const STATUS_LABELS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  ENTREGADO: 'Entregado',
};

const STATUS_COLORS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'bg-amber-50 text-amber-600 border-amber-100',
  CERRADO: 'bg-blue-50 text-blue-600 border-blue-100',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const NEXT_STATUS_LABEL: Record<ConsolidationStatus, string | null> = {
  ABIERTO: 'Cerrar orden de envío',
  CERRADO: 'Marcar como Entregado',
  ENTREGADO: null,
};

const DELIVERY_LABELS: Record<DeliveryMethod, string> = {
  CORREOS_CR: 'Correos de Costa Rica',
  TRACOPA: 'Tracopa',
  RETIRO: 'Retiro en oficina',
};

const STATUS_FILTERS: { value: ShipmentOrderStatusFilter; label: string }[] = [
  { value: ConsolidationStatus.ABIERTO, label: 'Abiertos' },
  { value: ConsolidationStatus.CERRADO, label: 'Cerrados' },
  { value: ConsolidationStatus.ENTREGADO, label: 'Entregados' },
  { value: 'ALL', label: 'Todos' },
];

const formatCRC = (n: number) => `₡${Math.round(n).toLocaleString('es-CR')}`;

export const ShipmentOrdersContainer: React.FC = () => {
  const {
    page, setPage,
    search, setSearch,
    statusFilter, handleStatusFilterChange,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    shipmentOrders, listMeta, isLoadingList,

    selectedUuid, setSelectedUuid,
    shipmentOrderDetail, isLoadingDetail,

    handleAdvanceStatus, isUpdating,

    showCreateModal, setShowCreateModal,
    createCustomerUuid, setCreateCustomerUuid,
    createCustomerSearch, setCreateCustomerSearch,
    handleOpenCreateModal,
    handleConfirmCreate,
    isCreating,
    filteredCustomers,

    showAssignModal, setShowAssignModal,
    availablePackages, isLoadingAvailable,
    selectedPackageUuids,
    handleTogglePackage,
    handleOpenAssignModal,
    handleConfirmAssign,
    isAssigning,

    handleSelectRow,
    openShipmentOrderCheck,

    showPreBillingModal, setShowPreBillingModal,
    preBillingDeliveryMethod, setPreBillingDeliveryMethod,
    handleGeneratePreBilling,
    isGeneratingPreBilling,
    handleConfirmPreBilling,
    isConfirmingPreBilling,
    handleDownloadPreBillingPDF,

    deleteUuid, setDeleteUuid,
    handleConfirmDelete,
    isDeleting,

    quickActionTarget, setQuickActionTarget,
    handleConfirmQuickAction,
  } = useShipmentOrders();

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
      header: 'Peso',
      accessor: 'total_weight_lb',
      align: 'center',
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
      render: (row) => (
        <span className="bg-slate-100 text-slate-600 font-black text-xs px-3 py-1 rounded-full">
          {row.package_count}
        </span>
      ),
    },
    {
      header: 'Fecha',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-400 font-medium">
          {new Date(row.created_at).toLocaleDateString('es-CR')}
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
              className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"
              title="Eliminar orden de envío"
            >
              <Trash2 size={14} />
            </button>
          )}
          {row.status === ConsolidationStatus.CERRADO && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setQuickActionTarget({ uuid: row.uuid, action: 'reopen' }); }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-amber-500 hover:bg-amber-50 transition-colors"
                title="Volver a abrir"
              >
                <RotateCcw size={14} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setQuickActionTarget({ uuid: row.uuid, action: 'dispatch' }); }}
                className="p-1.5 rounded-lg text-slate-300 hover:text-violet-500 hover:bg-violet-50 transition-colors"
                title="Marcar como despachado"
              >
                <SendHorizonal size={14} />
              </button>
            </>
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
              placeholder="Buscar por cliente o casillero..."
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
            onClick={handleOpenCreateModal}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Nueva Orden de Envío</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </div>

        {/* Filtros de estado */}
        <div className="px-4 py-2.5 overflow-x-auto">
          <div className="flex gap-1">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilterChange(f.value)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-tight transition-all whitespace-nowrap ${
                  statusFilter === f.value
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
              <p className="font-bold text-slate-800 text-sm truncate">{row.customer_name}</p>
              <p className="text-[10px] font-mono font-bold text-amber-400 uppercase mt-0.5">{row.customer_code}</p>
              <p className="text-xs text-slate-400 mt-1">
                {Number(row.total_weight_lb).toFixed(2)} lb · {row.package_count} paquete(s)
              </p>
            </div>
            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${STATUS_COLORS[row.status]}`}>
                {STATUS_LABELS[row.status]}
              </span>
              <span className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleDateString('es-CR')}</span>
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

      {/* MODAL: DETALLE DE ORDEN DE ENVÍO */}
      {selectedUuid && (
        <DetailModal
          detail={shipmentOrderDetail}
          isLoading={isLoadingDetail}
          isUpdating={isUpdating}
          isAssigning={isAssigning}
          isConfirmingPreBilling={isConfirmingPreBilling}
          onClose={() => setSelectedUuid(null)}
          onAdvanceStatus={handleAdvanceStatus}
          onReopen={() => shipmentOrderDetail && setQuickActionTarget({ uuid: shipmentOrderDetail.uuid, action: 'reopen' })}
          onOpenAssignModal={handleOpenAssignModal}
          onOpenPreBillingModal={() => setShowPreBillingModal(true)}
          onConfirmPreBilling={handleConfirmPreBilling}
          onDownloadPreBillingPDF={handleDownloadPreBillingPDF}
        />
      )}

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

      {/* MODAL: REABRIR / DESPACHAR */}
      {quickActionTarget && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setQuickActionTarget(null)}
        >
          <div
            className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 mb-5">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${quickActionTarget.action === 'reopen' ? 'bg-amber-50' : 'bg-violet-50'}`}>
                {quickActionTarget.action === 'reopen'
                  ? <RotateCcw size={18} className="text-amber-500" />
                  : <SendHorizonal size={18} className="text-violet-500" />
                }
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">
                  {quickActionTarget.action === 'reopen' ? '¿Volver a abrir esta orden de envío?' : '¿Marcar como despachada?'}
                </p>
                <p className="text-[12px] text-slate-500 mt-1 leading-relaxed">
                  {quickActionTarget.action === 'reopen'
                    ? 'La orden de envío volverá a estado ABIERTO y podrás seguir editándola.'
                    : 'La orden de envío pasará a estado ENTREGADO.'
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setQuickActionTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmQuickAction}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors flex items-center justify-center gap-2 ${quickActionTarget.action === 'reopen' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-violet-500 hover:bg-violet-600'}`}
              >
                {quickActionTarget.action === 'reopen'
                  ? <><RotateCcw size={14} /> Reabrir</>
                  : <><SendHorizonal size={14} /> Despachar</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREAR ORDEN DE ENVÍO */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-xl">
                <Boxes size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Nueva Orden de Envío
              </Typography>
            </div>

            <div className="mb-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Buscar cliente
              </label>
              <input
                type="text"
                placeholder="Nombre o casillero..."
                value={createCustomerSearch}
                onChange={(e) => setCreateCustomerSearch(e.target.value)}
                className="w-full bg-slate-50 px-4 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-sm"
              />
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1 mb-6">
              {filteredCustomers.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-4">Sin resultados</p>
              ) : (
                filteredCustomers.map((c: Customer) => (
                  <button
                    key={c.id}
                    onClick={() => setCreateCustomerUuid(c.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                      createCustomerUuid === c.id
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-transparent hover:border-slate-200'
                    }`}
                  >
                    <div>
                      <p className="font-bold text-sm">{c.first_name} {c.last_name}</p>
                      <p className={`text-[10px] font-mono font-bold ${createCustomerUuid === c.id ? 'text-amber-300' : 'text-amber-400'}`}>
                        {c.customer_code}
                      </p>
                    </div>
                    {createCustomerUuid === c.id && (
                      <div className="w-5 h-5 rounded-full bg-white flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-slate-900" />
                      </div>
                    )}
                  </button>
                ))
              )}
            </div>

            {openShipmentOrderCheck?.hasOpen && (
              <div className="mb-4 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
                <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-amber-800">Este cliente ya tiene una orden de envío abierta</p>
                  <p className="text-xs text-amber-700 mt-1">
                    ID: <span className="font-mono font-black">#{openShipmentOrderCheck.uuid?.slice(-5).toUpperCase()}</span>.
                    {' '}Ciérrala antes de crear una nueva, o selecciona otro cliente.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!createCustomerUuid || isCreating || !!openShipmentOrderCheck?.hasOpen}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isCreating ? 'Creando...' : 'Crear Orden de Envío'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ASIGNAR PAQUETES */}
      {showAssignModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowAssignModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-xl">
                  <Package size={18} className="text-slate-600" />
                </div>
                <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                  Asignar Paquetes
                </Typography>
              </div>
              {selectedPackageUuids.length > 0 && (
                <span className="bg-amber-600 text-white text-xs font-black px-3 py-1 rounded-full">
                  {selectedPackageUuids.length} seleccionado(s)
                </span>
              )}
            </div>

            {isLoadingAvailable ? (
              <div className="flex justify-center py-8">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : availablePackages.length === 0 ? (
              <div className="text-center py-8">
                <Package size={32} className="text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No hay paquetes disponibles para este cliente.</p>
                <p className="text-slate-400 text-xs mt-1">Los paquetes ya asignados a otra orden de envío no aparecen aquí.</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto space-y-2 mb-6">
                {availablePackages.map((pkg: AvailablePackage) => {
                  const selected = selectedPackageUuids.includes(pkg.uuid);
                  return (
                    <button
                      key={pkg.uuid}
                      onClick={() => handleTogglePackage(pkg.uuid)}
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
                        <p className="font-mono text-sm font-bold text-slate-800 truncate">{pkg.tracking_number}</p>
                        <p className="text-[10px] text-slate-400">
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
                onClick={() => setShowAssignModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmAssign}
                disabled={selectedPackageUuids.length === 0 || isAssigning}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isAssigning ? 'Asignando...' : `Asignar ${selectedPackageUuids.length || ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERAR PREFACTURA */}
      {showPreBillingModal && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setShowPreBillingModal(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 md:p-8 max-w-md w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-slate-100 rounded-xl">
                <FileText size={18} className="text-slate-600" />
              </div>
              <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800 uppercase tracking-wider text-xs">
                Generar Prefactura
              </Typography>
            </div>

            <div className="mb-6">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">
                Método de entrega
              </label>
              <div className="space-y-2">
                {(['CORREOS_CR', 'TRACOPA', 'RETIRO'] as DeliveryMethod[]).map((method) => (
                  <button
                    key={method}
                    onClick={() => setPreBillingDeliveryMethod(method)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl text-left transition-all border ${
                      preBillingDeliveryMethod === method
                        ? 'bg-slate-900 text-white border-slate-900'
                        : 'bg-slate-50 border-transparent hover:border-slate-200 text-slate-700'
                    }`}
                  >
                    <span className="font-bold text-sm">{DELIVERY_LABELS[method]}</span>
                    {preBillingDeliveryMethod === method && (
                      <CheckCircle size={16} className="text-amber-400" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowPreBillingModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleGeneratePreBilling}
                disabled={isGeneratingPreBilling}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isGeneratingPreBilling ? 'Generando...' : 'Generar Estimado'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type DetailModalProps = {
  detail: ConsolidationDetail | null;
  isLoading: boolean;
  isUpdating: boolean;
  isAssigning: boolean;
  isConfirmingPreBilling: boolean;
  onClose: () => void;
  onAdvanceStatus: () => void;
  onReopen: () => void;
  onOpenAssignModal: () => void;
  onOpenPreBillingModal: () => void;
  onConfirmPreBilling: () => void;
  onDownloadPreBillingPDF: (uuid: string, customerCode: string) => void;
};

const DetailModal: React.FC<DetailModalProps> = ({
  detail,
  isLoading,
  isUpdating,
  isAssigning,
  isConfirmingPreBilling,
  onClose,
  onAdvanceStatus,
  onReopen,
  onOpenAssignModal,
  onOpenPreBillingModal,
  onConfirmPreBilling,
  onDownloadPreBillingPDF,
}) => {
  const hasBilling = !!detail?.billing_uuid;
  const hasPreBilling = !!detail?.pre_billing_uuid;
  const preBillingConfirmed = !!detail?.pre_billing_confirmed;

  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] p-5 sm:p-8 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {isLoading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : detail ? (
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-6">
              <div>
                <Typography variant={TypographyVariant.HEADER} className="text-2xl tracking-tighter">
                  {detail.customer_name}
                </Typography>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                  {detail.customer_code} · {detail.customer_email}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all">
                <X size={18} className="text-slate-400" />
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2 mb-6">
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-wide border inline-block max-w-full truncate ${STATUS_COLORS[detail.status]}`}>
                  {STATUS_LABELS[detail.status]}
                </span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso Total</p>
                <p className="font-black text-slate-800 text-base">
                  {Number(detail.total_weight_lb).toFixed(2)} <span className="text-xs text-slate-400">lb</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paquetes</p>
                <p className="font-black text-slate-800 text-base">{detail.packages.length}</p>
              </div>
            </div>

            {/* Pre-billing section */}
            {!hasBilling && (
              <div className="mb-6">
                {!hasPreBilling ? (
                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                    <div>
                      <p className="text-xs font-black text-slate-700">Prefactura</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Genera el estimado para enviar al cliente</p>
                    </div>
                    <button
                      onClick={onOpenPreBillingModal}
                      disabled={detail.packages.length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all disabled:opacity-40"
                    >
                      <FileText size={14} />
                      Generar
                    </button>
                  </div>
                ) : preBillingConfirmed ? (
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                    <div className="flex items-center gap-3">
                      <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-black text-emerald-800">Prefactura confirmada</p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">
                          {formatCRC(detail.pre_billing_amount ?? 0)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => onDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                      className="flex items-center gap-2 px-3 py-2 bg-white border border-emerald-200 text-emerald-700 rounded-xl font-bold text-xs hover:bg-emerald-50 transition-all"
                    >
                      <Download size={13} />
                      PDF
                    </button>
                  </div>
                ) : (
                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-xs font-black text-amber-900">Estimado pendiente de confirmación</p>
                        <p className="text-[10px] text-amber-700 mt-0.5">
                          {detail.pre_billing_delivery_method
                            ? `Entrega: ${detail.pre_billing_delivery_method === 'CORREOS_CR' ? 'Correos CR' : detail.pre_billing_delivery_method === 'TRACOPA' ? 'Tracopa' : 'Retiro'}`
                            : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onDownloadPreBillingPDF(detail.pre_billing_uuid!, detail.customer_code)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-200 text-amber-700 rounded-lg font-bold text-[10px] hover:bg-amber-50 transition-all"
                        >
                          <Download size={12} />
                          PDF
                        </button>
                        <button
                          onClick={onOpenPreBillingModal}
                          className="text-[9px] font-black text-amber-700 underline underline-offset-2"
                        >
                          Recalcular
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-black text-amber-900">
                        {formatCRC(detail.pre_billing_amount ?? 0)}
                      </p>
                      <button
                        onClick={onConfirmPreBilling}
                        disabled={isConfirmingPreBilling}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-xs hover:bg-amber-500 transition-all disabled:opacity-40"
                      >
                        <CheckCircle size={14} />
                        {isConfirmingPreBilling ? 'Confirmando...' : 'Confirmar y Facturar'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {hasBilling && (
              <div className="mb-6 flex items-center gap-3 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                <CheckCircle size={18} className="text-emerald-600 flex-shrink-0" />
                <div>
                  <p className="text-xs font-black text-emerald-800">Factura generada</p>
                  <p className="text-[10px] text-emerald-600 mt-0.5">Esta orden de envío ya tiene factura</p>
                </div>
              </div>
            )}

            {/* Packages list */}
            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Paquetes en esta orden de envío
              </p>
              {detail.packages.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-sm">
                  Sin paquetes asignados aún.
                </div>
              ) : (
                <PackageTable packages={detail.packages} />
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {detail.status === ConsolidationStatus.ABIERTO && (
                <button
                  onClick={onOpenAssignModal}
                  disabled={isAssigning}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-100 text-slate-700 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all disabled:opacity-40"
                >
                  <Package size={16} />
                  Asignar Paquetes
                </button>
              )}
              {detail.status === ConsolidationStatus.CERRADO && (
                <button
                  onClick={onReopen}
                  disabled={isUpdating}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-2xl font-bold text-sm hover:bg-amber-100 transition-all disabled:opacity-40"
                >
                  <RotateCcw size={16} />
                  Volver a abrir
                </button>
              )}
              {NEXT_STATUS_LABEL[detail.status] && (
                <button
                  onClick={onAdvanceStatus}
                  disabled={isUpdating || (detail.status === ConsolidationStatus.ABIERTO && detail.packages.length === 0)}
                  className="flex-1 flex items-center justify-center gap-2 py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
                >
                  <ArrowRight size={16} />
                  {isUpdating ? 'Actualizando...' : NEXT_STATUS_LABEL[detail.status]}
                </button>
              )}
              {detail.status === ConsolidationStatus.ENTREGADO && (
                <button
                  onClick={onClose}
                  className="flex-1 py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                >
                  Cerrar
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center py-8 gap-3">
            <X size={32} className="text-red-400" />
            <p className="text-slate-500 text-sm">No se pudo cargar el detalle.</p>
            <button onClick={onClose} className="mt-2 px-6 py-2 bg-slate-100 rounded-xl text-sm font-bold">
              Cerrar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PackageTable: React.FC<{ packages: ConsolidationPackage[] }> = ({ packages }) => (
  <div className="space-y-2">
    {packages.map((pkg) => (
      <div
        key={pkg.uuid}
        className="flex items-center gap-3 px-4 py-3 bg-slate-50 rounded-2xl"
      >
        <Package size={14} className="text-slate-400 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-bold text-slate-800 truncate">{pkg.tracking_number}</p>
          <p className="text-[10px] text-slate-400">
            {Number(pkg.weight_lb).toFixed(2)} lb · {pkg.package_type}
          </p>
        </div>
        <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
          {pkg.status}
        </span>
      </div>
    ))}
  </div>
);

export default ShipmentOrdersContainer;
