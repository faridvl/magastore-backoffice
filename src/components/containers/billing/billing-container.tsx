import { formatBusinessDate } from '@/shared/utils/timezone';
import { formatWeight, formatCount } from '@/shared/utils/format';
import React from 'react';
import { useRouter } from 'next/router';
import { Search, ChevronRight, X } from 'lucide-react';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { BillingDetailModal } from '@/components/common/billing-detail-modal/billing-detail-modal';
import { DateRangeFilter, formatPeriodLabel } from '@/components/common/date-range-filter/date-range-filter';
import { FilterBar, FilterBarField } from '@/components/common/filter-bar/filter-bar';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/shared/constants/payment-methods';
import { LoadErrorPanel } from '@/components/containers/logistics/load-error-panel';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { useBilling, BillingPaidFilter } from './use-billing';
import { BillingListItem, ConsolidationPaymentStatus, PaymentMethod, ShipmentOrderStep } from '@/types/logistics/logistics.types';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import { resolveDeliveryMethodLabel } from '@/shared/utils/delivery-method-label';
import { Badge } from '@/components/common/badge/badge';
import {
  BadgeTone,
  ORDER_STEP_LABEL,
  ORDER_STEP_TONE,
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
} from '@/shared/constants/status-labels';
import { CONSOLIDATION_STATUS_LABEL, CONSOLIDATION_STATUS_TONE } from '@/components/containers/logistics/logistics-labels';
import { formatCrc } from '@/shared/utils/format-crc';

const formatCRC = formatCrc;
const formatInvoiceNumber = (n: number) => `F-${String(n).padStart(4, '0')}`;

const PAGE_SIZE = 10;
const EMPTY_VALUE = '—';
const NO_CUSTOMER_LABEL = 'Sin cliente';

const PAID_FILTER_LABEL = 'Estado de pago';
const METHOD_FILTER_LABEL = 'Método de pago';

const PAID_FILTER_OPTIONS = [
  { value: BillingPaidFilter.POR_COBRAR, label: PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PENDIENTE_PAGO] },
  { value: BillingPaidFilter.PAGADA, label: PAYMENT_STATUS_LABEL[ConsolidationPaymentStatus.PAGADO] },
];

const METHOD_FILTER_OPTIONS = PAYMENT_METHOD_OPTIONS.map((method) => ({
  value: method,
  label: PAYMENT_METHOD_LABELS[method],
}));

const PaymentBadge: React.FC<{ isPaid: boolean }> = ({ isPaid }) => {
  const status = isPaid ? ConsolidationPaymentStatus.PAGADO : ConsolidationPaymentStatus.PENDIENTE_PAGO;
  return <Badge tone={PAYMENT_STATUS_TONE[status]}>{PAYMENT_STATUS_LABEL[status]}</Badge>;
};

// Badge y, si ya se pagó y se sabe cómo, el método debajo ("SINPE Móvil").
const PaymentCell: React.FC<{ row: BillingListItem; align?: 'start' | 'center' }> = ({ row, align = 'center' }) => (
  <div className={`flex flex-col gap-1 ${align === 'center' ? 'items-center' : 'items-start'}`}>
    <PaymentBadge isPaid={row.is_paid} />
    {row.is_paid && row.payment_method && (
      <span className="whitespace-nowrap text-xs text-slate-500">
        {PAYMENT_METHOD_LABELS[row.payment_method]}
      </span>
    )}
  </div>
);

// El paso es el mismo nombre que ve el operador en Órdenes; si la factura no trae paso, cae al estado.
const OrderBadge: React.FC<{ row: BillingListItem }> = ({ row }) => {
  const step = Number(row.consolidation_step) as ShipmentOrderStep;
  const stepLabel = ORDER_STEP_LABEL[step];
  if (stepLabel) return <Badge tone={ORDER_STEP_TONE[step]}>{stepLabel}</Badge>;
  if (!row.consolidation_status) return <span className="text-sm text-slate-300">{EMPTY_VALUE}</span>;
  return (
    <Badge tone={CONSOLIDATION_STATUS_TONE[row.consolidation_status] ?? BadgeTone.NEUTRAL}>
      {CONSOLIDATION_STATUS_LABEL[row.consolidation_status] ?? row.consolidation_status}
    </Badge>
  );
};

export const BillingContainer: React.FC = () => {
  const router = useRouter();
  const {
    page, setPage,
    search, setSearch,
    paidFilter, handlePaidFilterChange,
    paymentMethod, handlePaymentMethodChange,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    clearDates, clearFilters, hasActiveFilters,
    selectedBillingUuid, setSelectedBillingUuid,
    billingList, listMeta, listSummary, isLoadingList, isListError, refetchList,
    billingDetail, isLoadingDetail, isFetchingDetail, retryDetail,
    handleMarkAsPaid, isMarkingPaid,
    handleDownloadPdf, isDownloadingPdf,
  } = useBilling();
  const { data: deliveryMethodsData } = useDeliveryMethodsQuery();

  const deliveryLabel = (row: BillingListItem) =>
    row.delivery_method ? resolveDeliveryMethodLabel(row.delivery_method, deliveryMethodsData?.data) : '';

  const goToOrder = (uuid: string) => router.push(`/admin/shipment-orders/${uuid}`);

  const emptyTitle = hasActiveFilters ? 'Ninguna factura con estos filtros' : 'Aún no hay facturas';

  const filterFields: FilterBarField[] = [
    {
      key: 'paid',
      label: PAID_FILTER_LABEL,
      chipPrefix: PAID_FILTER_LABEL,
      emptyLabel: 'Todas',
      options: PAID_FILTER_OPTIONS,
      value: paidFilter === BillingPaidFilter.ALL ? null : paidFilter,
      onChange: (value) => handlePaidFilterChange((value as BillingPaidFilter | null) ?? BillingPaidFilter.ALL),
    },
    // Una factura por cobrar no tiene método de pago: con ese estado el filtro siempre daría cero.
    ...(paidFilter === BillingPaidFilter.POR_COBRAR
      ? []
      : [{
          key: 'method',
          label: METHOD_FILTER_LABEL,
          chipPrefix: METHOD_FILTER_LABEL,
          emptyLabel: 'Todos',
          options: METHOD_FILTER_OPTIONS,
          value: paymentMethod,
          onChange: (value: string | null) => handlePaymentMethodChange((value as PaymentMethod | null) ?? null),
        } as FilterBarField]),
  ];

  const billingColumns: Column<BillingListItem>[] = [
    {
      header: 'Factura',
      accessor: 'invoice_number',
      noWrap: true,
      render: (row) => (
        <span className="whitespace-nowrap font-mono text-sm font-black text-slate-600 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg">
          {formatInvoiceNumber(row.invoice_number)}
        </span>
      ),
    },
    {
      header: 'Cliente',
      accessor: 'customer_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm leading-tight mb-1">{row.customer_name || NO_CUSTOMER_LABEL}</span>
          {row.customer_code && (
            <span className="whitespace-nowrap text-xs font-mono font-bold text-amber-600 uppercase">{row.customer_code}</span>
          )}
          {/* Peso, fecha y entrega tienen columna propia solo desde 2xl; antes se resumen aquí */}
          <span className="text-xs text-slate-500 mt-1 2xl:hidden">
            {formatWeight(row.total_weight_charged)} · {formatBusinessDate(row.created_at)}
          </span>
          {row.delivery_method && (
            <span className="text-xs text-slate-500 2xl:hidden">
              {deliveryLabel(row)}{row.delivery_fee_crc > 0 ? ` · ${formatCRC(row.delivery_fee_crc)}` : ''}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Peso',
      accessor: 'total_weight_charged',
      align: 'center',
      noWrap: true,
      className: 'hidden 2xl:table-cell',
      render: (row) => (
        <span className="font-black text-slate-700 text-sm">
          {formatWeight(row.total_weight_charged)}
        </span>
      ),
    },
    {
      header: 'Entrega',
      accessor: 'delivery_method',
      className: 'hidden 2xl:table-cell',
      render: (row) => row.delivery_method ? (
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-slate-600">
            {deliveryLabel(row)}
          </span>
          {row.delivery_fee_crc > 0 && (
            <span className="whitespace-nowrap text-xs text-slate-500">{formatCRC(row.delivery_fee_crc)}</span>
          )}
        </div>
      ) : (
        <span className="text-sm text-slate-300">{EMPTY_VALUE}</span>
      ),
    },
    {
      header: 'Total',
      accessor: 'total_amount_crc',
      noWrap: true,
      render: (row) => (
        <span className="text-lg font-black text-slate-900">{formatCRC(row.total_amount_crc)}</span>
      ),
    },
    {
      header: 'Pago',
      accessor: 'is_paid',
      align: 'center',
      noWrap: true,
      render: (row) => <PaymentCell row={row} />,
    },
    {
      header: 'Orden',
      accessor: 'consolidation_status',
      align: 'center',
      noWrap: true,
      render: (row) => row.consolidation_uuid ? (
        <button
          onClick={(e) => { e.stopPropagation(); goToOrder(row.consolidation_uuid as string); }}
          className="mx-auto flex min-h-[44px] items-center gap-1 transition-opacity hover:opacity-80"
        >
          <OrderBadge row={row} />
          <ChevronRight size={14} className="text-slate-400" />
        </button>
      ) : (
        <span className="text-sm text-slate-300">{EMPTY_VALUE}</span>
      ),
    },
    {
      header: 'Fecha',
      accessor: 'created_at',
      noWrap: true,
      className: 'hidden 2xl:table-cell',
      render: (row) => (
        <span className="text-sm text-slate-500 font-medium">
          {formatBusinessDate(row.created_at)}
        </span>
      ),
    },
  ];

  const isSummaryReady = !isLoadingList && !!listSummary;

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

      {/* TOOLBAR: misma barra que Órdenes y Clientes */}
      <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
        <FilterBar
          leading={
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Cliente, casillero o factura"
                aria-label="Buscar facturas"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full min-h-[44px] bg-slate-50 pl-10 pr-12 rounded-full border border-slate-100 outline-none focus:ring-2 focus:ring-slate-200 text-base"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  title="Limpiar búsqueda"
                  aria-label="Limpiar búsqueda"
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>
          }
          fields={filterFields}
          extraPanelContent={
            <div className="flex flex-col gap-2.5">
              <span className="text-sm font-bold text-slate-900">Fecha de emisión</span>
              <DateRangeFilter
                inline
                from={dateFrom} to={dateTo}
                onFromChange={setDateFrom} onToChange={setDateTo}
                onClear={clearDates}
              />
            </div>
          }
          extraActiveCount={dateFrom || dateTo ? 1 : 0}
          extraChips={dateFrom || dateTo ? [{ key: 'period', label: `Emitidas ${formatPeriodLabel(dateFrom, dateTo)}`, onRemove: clearDates }] : []}
          onClearExtra={clearFilters}
          resultCount={isLoadingList || isListError ? undefined : listMeta.total}
        />
        {/* Conteo y totales de todo lo que cumple los filtros (no solo de esta página): mismo WHERE que el listado */}
        {!isListError && (
          <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1 text-sm font-semibold text-slate-500">
            <span>{isSummaryReady ? formatCount(listMeta.total, 'factura', 'facturas') : EMPTY_VALUE}</span>
            <span>Facturado {isSummaryReady ? formatCRC(listSummary.total_amount_crc) : EMPTY_VALUE}</span>
            <span>Por cobrar {isSummaryReady ? formatCRC(listSummary.pending_amount_crc) : EMPTY_VALUE}</span>
          </p>
        )}
      </div>

      {isListError ? (
        <LoadErrorPanel onRetry={() => refetchList()} />
      ) : (
        <>
          {/* Tabla — desde xl; antes cabe mejor en tarjetas */}
          <div className="hidden xl:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
            <NewTable
              data={billingList}
              columns={billingColumns}
              isLoading={isLoadingList}
              totalRows={listMeta.total}
              currentPage={listMeta.page}
              totalPages={listMeta.totalPages}
              onPageChange={setPage}
              onRowClick={(item) => setSelectedBillingUuid(item.uuid)}
              itemsPerPage={PAGE_SIZE}
              hideCount
              emptyTitle={emptyTitle}
              emptyActionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
              onEmptyAction={hasActiveFilters ? clearFilters : undefined}
            />
          </div>

          {/* Tarjetas — hasta xl */}
          <div className="xl:hidden space-y-3">
            {isLoadingList ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : billingList.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100">
                <EmptyState
                  title={emptyTitle}
                  actionLabel={hasActiveFilters ? 'Limpiar filtros' : undefined}
                  onAction={hasActiveFilters ? clearFilters : undefined}
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {billingList.map((row) => (
                  <div
                    key={row.uuid}
                    className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3"
                  >
                    <button
                      onClick={() => setSelectedBillingUuid(row.uuid)}
                      className="w-full text-left flex flex-col gap-3 active:opacity-70 transition-opacity"
                    >
                      <div className="flex justify-between items-start gap-3">
                        <div className="min-w-0">
                          {/* El número de factura es lo que se usa para referirse a
                              ella por WhatsApp o al buscarla, así que encabeza la tarjeta. */}
                          <p className="whitespace-nowrap text-xs font-mono font-black text-slate-500">
                            {formatInvoiceNumber(row.invoice_number)}
                          </p>
                          <p className="font-bold text-slate-800 text-sm">{row.customer_name || NO_CUSTOMER_LABEL}</p>
                          {row.customer_code && (
                            <p className="whitespace-nowrap text-xs font-mono font-bold text-amber-600 uppercase">{row.customer_code}</p>
                          )}
                        </div>
                        <PaymentCell row={row} align="start" />
                      </div>
                      <div className="flex justify-between items-end gap-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-xs text-slate-500">{formatWeight(row.total_weight_charged)}{row.delivery_method ? ` · ${deliveryLabel(row)}` : ''}</span>
                          <span className="text-xs text-slate-500">{formatBusinessDate(row.created_at)}</span>
                        </div>
                        <span className="whitespace-nowrap text-xl font-black text-slate-900">{formatCRC(row.total_amount_crc)}</span>
                      </div>
                    </button>
                    {row.consolidation_uuid && (
                      <button
                        onClick={() => goToOrder(row.consolidation_uuid as string)}
                        className="flex min-h-[44px] items-center justify-between gap-2 border-t border-slate-100 pt-2 text-sm font-semibold text-slate-600"
                      >
                        <span className="flex items-center gap-2">
                          Orden · <OrderBadge row={row} />
                        </span>
                        <ChevronRight size={16} className="text-slate-400" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
            {listMeta.totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 pt-2">
                <Button variant={ButtonVariant.CANCEL} disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button>
                <span className="text-sm font-semibold text-slate-500">{page} / {listMeta.totalPages}</span>
                <Button variant={ButtonVariant.CANCEL} disabled={page >= listMeta.totalPages} onClick={() => setPage(page + 1)}>Siguiente</Button>
              </div>
            )}
          </div>
        </>
      )}

      {/* MODAL: DETALLE DE FACTURA */}
      {selectedBillingUuid && (
        <BillingDetailModal
          billingDetail={billingDetail}
          isLoading={isLoadingDetail}
          isRetrying={isFetchingDetail}
          onRetry={retryDetail}
          onClose={() => setSelectedBillingUuid(null)}
          onMarkAsPaid={handleMarkAsPaid}
          isMarkingPaid={isMarkingPaid}
          onDownloadPdf={handleDownloadPdf}
          isDownloadingPdf={isDownloadingPdf}
          onViewOrder={goToOrder}
        />
      )}
    </div>
  );
};

export default BillingContainer;
