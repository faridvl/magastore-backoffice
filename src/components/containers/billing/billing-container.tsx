import React from 'react';
import { useRouter } from 'next/router';
import { Search, ChevronRight } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { BillingDetailModal } from '@/components/common/billing-detail-modal/billing-detail-modal';
import { useBilling, PaidFilterValue } from './use-billing';
import { BillingListItem, ConsolidationStatus } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';

const formatCRC = (amount: number) => `₡${Math.round(amount).toLocaleString('es-CR')}`;
const formatInvoiceNumber = (n: number) => `F-${String(n).padStart(4, '0')}`;

const ORDER_STATUS_LABELS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'Abierto',
  CERRADO: 'Cerrado',
  DESPACHADO: 'Despachado',
  ENTREGADO: 'Entregado',
};

const ORDER_STATUS_COLORS: Record<ConsolidationStatus, string> = {
  ABIERTO: 'bg-amber-50 text-amber-600 border-amber-100',
  CERRADO: 'bg-blue-50 text-blue-600 border-blue-100',
  DESPACHADO: 'bg-violet-50 text-violet-600 border-violet-100',
  ENTREGADO: 'bg-emerald-50 text-emerald-700 border-emerald-100',
};

export const BillingContainer: React.FC = () => {
  const router = useRouter();
  const {
    page, setPage,
    search, setSearch,
    paidFilter, handlePaidFilterChange,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    selectedBillingUuid, setSelectedBillingUuid,
    billingList, listMeta, isLoadingList,
    billingDetail, isLoadingDetail,
    handleMarkAsPaid, isMarkingPaid,
    handleDownloadPdf, isDownloadingPdf,
  } = useBilling();
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();

  const billingColumns: Column<BillingListItem>[] = [
    {
      header: 'Factura',
      accessor: 'invoice_number',
      render: (row) => (
        <span className="font-mono text-xs font-black text-slate-500 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
          {formatInvoiceNumber(row.invoice_number)}
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
          {/* En pantallas angostas (iPad) las columnas Peso/Fecha se ocultan — se resumen aquí */}
          <span className="text-[10px] text-slate-400 mt-1 xl:hidden">
            {row.total_weight_charged} lb · {new Date(row.created_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}
          </span>
        </div>
      ),
    },
    {
      header: 'Peso',
      accessor: 'total_weight_charged',
      align: 'center',
      className: 'hidden xl:table-cell',
      render: (row) => (
        <span className="font-black text-slate-700 text-sm">
          {row.total_weight_charged} <span className="text-[10px] text-slate-400">lb</span>
        </span>
      ),
    },
    {
      header: 'Entrega',
      accessor: 'delivery_method',
      className: 'hidden lg:table-cell',
      render: (row) => row.delivery_method ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">
            {resolveDeliveryMethodLabel(row.delivery_method, deliveryMethodsData?.data)}
          </span>
          {row.delivery_fee_crc > 0 && (
            <span className="text-[10px] text-slate-400">{formatCRC(row.delivery_fee_crc)}</span>
          )}
        </div>
      ) : (
        <span className="text-[10px] text-slate-300 italic">—</span>
      ),
    },
    {
      header: 'Total',
      accessor: 'total_amount_crc',
      render: (row) => (
        <span className="text-lg font-black text-slate-900">{formatCRC(row.total_amount_crc)}</span>
      ),
    },
    {
      header: 'Pago',
      accessor: 'is_paid',
      align: 'center',
      render: (row) => (
        <span className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
          row.is_paid
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            : 'bg-orange-50 text-orange-600 border border-orange-100 animate-pulse'
        }`}>
          {row.is_paid ? 'Pagado' : 'Pendiente'}
        </span>
      ),
    },
    {
      header: 'Orden',
      accessor: 'consolidation_status',
      align: 'center',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); router.push(`/admin/shipment-orders/${row.consolidation_uuid}`); }}
          className={`flex items-center gap-1 mx-auto px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider border transition-colors hover:opacity-80 ${ORDER_STATUS_COLORS[row.consolidation_status]}`}
        >
          {ORDER_STATUS_LABELS[row.consolidation_status]}
          <ChevronRight size={11} />
        </button>
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
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Typography variant={TypographyVariant.HEADER} className="text-2xl tracking-tighter">
          Facturación
        </Typography>
      </div>

      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
        {/* Búsqueda */}
        <div className="relative w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Buscar por cliente, casillero o N.º de factura..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-sm"
          />
        </div>
        {/* Pills de estado + fechas */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
          <div className="flex gap-1 bg-slate-100/60 p-1.5 rounded-2xl w-full sm:w-auto sm:flex-shrink-0">
            {(['all', 'pending', 'paid'] as PaidFilterValue[]).map((f) => (
              <button
                key={f}
                onClick={() => handlePaidFilterChange(f)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all whitespace-nowrap ${
                  paidFilter === f
                    ? 'bg-white shadow-sm text-slate-800'
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {f === 'all' ? 'Todos' : f === 'paid' ? 'Pagados' : 'Pendientes'}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                Limpiar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabla — solo md+ */}
      <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
        <NewTable
          data={billingList}
          columns={billingColumns}
          isLoading={isLoadingList}
          totalRows={listMeta.total}
          currentPage={listMeta.page}
          totalPages={listMeta.totalPages}
          onPageChange={setPage}
          onRowClick={(item) => setSelectedBillingUuid(item.uuid)}
          itemsPerPage={10}
        />
      </div>

      {/* Cards — solo mobile */}
      <div className="md:hidden space-y-3">
        {isLoadingList ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
          </div>
        ) : billingList.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center text-slate-400 text-sm">Sin registros.</div>
        ) : (
          billingList.map((row) => (
            <button
              key={row.uuid}
              onClick={() => setSelectedBillingUuid(row.uuid)}
              className="w-full bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex flex-col gap-3 active:bg-slate-50 transition-colors"
            >
              <div className="flex justify-between items-start">
                <div>
                  {/* El numero de factura es lo que se usa para referirse a
                      ella por WhatsApp o al buscarla, asi que encabeza la card. */}
                  <p className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                    {formatInvoiceNumber(row.invoice_number)}
                  </p>
                  <p className="font-bold text-slate-800 text-sm">{row.customer_name}</p>
                  <p className="text-[10px] font-mono font-bold text-amber-400 uppercase">{row.customer_code}</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  row.is_paid
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                    : 'bg-orange-50 text-orange-600 border border-orange-100'
                }`}>
                  {row.is_paid ? 'Pagado' : 'Pendiente'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${ORDER_STATUS_COLORS[row.consolidation_status]}`}>
                  {ORDER_STATUS_LABELS[row.consolidation_status]}
                </span>
              </div>
              <div className="flex justify-between items-end">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-slate-400">{row.total_weight_charged} lb · {row.delivery_method ? resolveDeliveryMethodLabel(row.delivery_method, deliveryMethodsData?.data) : '—'}</span>
                  <span className="text-[10px] text-slate-400">{new Date(row.created_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}</span>
                </div>
                <span className="text-xl font-black text-slate-900">{formatCRC(row.total_amount_crc)}</span>
              </div>
            </button>
          ))
        )}
        {listMeta.totalPages > 1 && (
          <div className="flex justify-center gap-3 pt-2">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-500 disabled:opacity-40">Anterior</button>
            <span className="px-4 py-2 text-xs font-bold text-slate-400">{page} / {listMeta.totalPages}</span>
            <button disabled={page >= listMeta.totalPages} onClick={() => setPage(page + 1)} className="px-4 py-2 bg-white border border-slate-100 rounded-xl text-xs font-bold text-slate-500 disabled:opacity-40">Siguiente</button>
          </div>
        )}
      </div>

      {/* MODAL: DETALLE DE FACTURA */}
      {selectedBillingUuid && (
        <BillingDetailModal
          billingDetail={billingDetail}
          isLoading={isLoadingDetail}
          onClose={() => setSelectedBillingUuid(null)}
          onMarkAsPaid={handleMarkAsPaid}
          isMarkingPaid={isMarkingPaid}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
        />
      )}
    </div>
  );
};

export default BillingContainer;
