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
} from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useConsolidations, ConsolidationStatusFilter } from './use-consolidations';
import {
  ConsolidationListItem,
  ConsolidationDetail,
  ConsolidationStatus,
  ConsolidationPackage,
  AvailablePackage,
} from '@/types/logistics/logistics.types';
import { Customer } from '@/types/customer/customer.types';

const STATUS_LABELS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
};

const STATUS_COLORS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'bg-amber-50 text-amber-600 border-amber-100',
  CERRADO: 'bg-amber-50 text-amber-600 border-amber-100',
  DESPACHADO: 'bg-violet-50 text-amber-600 border-violet-100',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

const NEXT_STATUS_LABEL: Record<ConsolidationStatus, string | null> = {
  ABIERTO: 'Cerrar consolidación',
  CERRADO: 'Marcar como Despachado',
  DESPACHADO: 'Marcar como Entregado',
  ENTREGADO: null,
};

const STATUS_FILTERS: { value: ConsolidationStatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Todos' },
  { value: ConsolidationStatus.ABIERTO, label: 'Abiertos' },
  { value: ConsolidationStatus.CERRADO, label: 'Cerrados' },
  { value: ConsolidationStatus.DESPACHADO, label: 'Despachados' },
  { value: ConsolidationStatus.ENTREGADO, label: 'Entregados' },
];

export const ConsolidationsContainer: React.FC = () => {
  const {
    page, setPage,
    search, setSearch,
    statusFilter, handleStatusFilterChange,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    consolidations, listMeta, isLoadingList,

    selectedUuid, setSelectedUuid,
    consolidationDetail, isLoadingDetail,

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
  } = useConsolidations();

  const listColumns: Column<ConsolidationListItem>[] = [
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
      accessor: 'uuid',
      align: 'right',
      render: () => (
        <ChevronRight size={16} className="text-slate-300" />
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

      {/* TOOLBAR */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
        {/* Fila 1: búsqueda (mobile: full width, sm+: con botón inline) */}
        <div className="flex gap-3 items-center">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar por cliente o casillero..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-sm"
            />
          </div>
          <button
            onClick={handleOpenCreateModal}
            className="hidden sm:flex items-center gap-2 px-4 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm whitespace-nowrap flex-shrink-0"
          >
            <Plus size={16} />
            Nueva Consolidación
          </button>
        </div>

        {/* Fila 2 (solo mobile): botón nueva consolidación */}
        <button
          onClick={handleOpenCreateModal}
          className="sm:hidden flex items-center justify-center gap-2 w-full py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm"
        >
          <Plus size={16} />
          Nueva Consolidación
        </button>

        {/* Fila 3: filtros de estado */}
        <div className="overflow-x-auto -mx-0.5 px-0.5">
          <div className="flex gap-1 bg-slate-100/60 p-1.5 rounded-2xl w-max min-w-full">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => handleStatusFilterChange(f.value)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                  statusFilter === f.value
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Fila 4: filtros de fecha */}
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full bg-slate-50 border-none px-3 py-2 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full bg-slate-50 border-none px-3 py-2 rounded-xl text-sm text-slate-700 outline-none focus:ring-2 focus:ring-amber-100"
              />
            </div>
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="w-full px-3 py-2 rounded-xl text-[9px] font-black text-slate-400 hover:text-slate-600 bg-slate-50 transition-colors"
            >
              Limpiar fechas
            </button>
          )}
        </div>
      </div>

      {/* CARDS (mobile) */}
      <div className="flex flex-col gap-3 md:hidden">
        {isLoadingList ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-20" />
          ))
        ) : consolidations.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Boxes size={24} className="text-slate-300" />
            </div>
            <p className="font-black text-slate-400 text-sm">Sin consolidaciones</p>
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest text-center px-8">
              No hay consolidaciones que coincidan con los filtros
            </p>
          </div>
        ) : consolidations.map((row) => (
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
          data={consolidations}
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

      {/* MODAL: DETALLE DE CONSOLIDACIÓN */}
      {selectedUuid && (
        <DetailModal
          detail={consolidationDetail}
          isLoading={isLoadingDetail}
          isUpdating={isUpdating}
          isAssigning={isAssigning}
          onClose={() => setSelectedUuid(null)}
          onAdvanceStatus={handleAdvanceStatus}
          onOpenAssignModal={handleOpenAssignModal}
        />
      )}

      {/* MODAL: CREAR CONSOLIDACIÓN */}
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
                Nueva Consolidación
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

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreate}
                disabled={!createCustomerUuid || isCreating}
                className="py-3.5 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-lg disabled:opacity-40"
              >
                {isCreating ? 'Creando...' : 'Crear Consolidación'}
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
                <p className="text-slate-400 text-xs mt-1">Los paquetes ya asignados a otra consolidación no aparecen aquí.</p>
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
    </div>
  );
};

type DetailModalProps = {
  detail: ConsolidationDetail | null;
  isLoading: boolean;
  isUpdating: boolean;
  isAssigning: boolean;
  onClose: () => void;
  onAdvanceStatus: () => void;
  onOpenAssignModal: () => void;
};

const DetailModal: React.FC<DetailModalProps> = ({
  detail,
  isLoading,
  isUpdating,
  isAssigning,
  onClose,
  onAdvanceStatus,
  onOpenAssignModal,
}) => {
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-[2.5rem] p-8 max-w-xl w-full shadow-2xl animate-in fade-in zoom-in duration-200 max-h-[90vh] flex flex-col"
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
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-slate-50 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${STATUS_COLORS[detail.status]}`}>
                  {STATUS_LABELS[detail.status]}
                </span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Peso Total</p>
                <p className="font-black text-slate-800 text-lg">
                  {Number(detail.total_weight_lb).toFixed(2)} <span className="text-xs text-slate-400">lb</span>
                </p>
              </div>
              <div className="bg-slate-50 rounded-2xl p-4 text-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Paquetes</p>
                <p className="font-black text-slate-800 text-lg">{detail.packages.length}</p>
              </div>
            </div>

            {/* Packages list */}
            <div className="flex-1 overflow-y-auto mb-6">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">
                Paquetes en esta consolidación
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
            <div className="flex gap-3">
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

export default ConsolidationsContainer;
