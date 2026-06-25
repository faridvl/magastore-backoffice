import React from 'react';
import { Search, FileText, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useBilling, PaidFilterValue, ActiveBillingTab } from './use-billing';
import { BillingListItem, PendingConsolidation } from '@/types/logistics/logistics.types';

const formatCRC = (amount: number) => `₡${Math.round(amount).toLocaleString('es-CR')}`;

export const BillingContainer: React.FC = () => {
  const {
    activeTab, setActiveTab,
    page, setPage,
    search, setSearch,
    paidFilter, handlePaidFilterChange,
    selectedBillingUuid, setSelectedBillingUuid,
    billingList, listMeta, isLoadingList,
    pendingConsolidations, isLoadingPending,
    billingDetail, isLoadingDetail,
    handleGenerateInvoice, isGenerating,
    handleMarkAsPaid, isMarkingPaid,
  } = useBilling();

  const billingColumns: Column<BillingListItem>[] = [
    {
      header: 'Cliente',
      accessor: 'customer_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm leading-none mb-1">{row.customer_name}</span>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">{row.customer_code}</span>
        </div>
      ),
    },
    {
      header: 'Peso Cobrado',
      accessor: 'total_weight_charged',
      align: 'center',
      render: (row) => (
        <span className="font-black text-slate-700 text-sm">{row.total_weight_charged} <span className="text-[10px] text-slate-400">lb</span></span>
      ),
    },
    {
      header: 'Total CRC',
      accessor: 'total_amount_crc',
      render: (row) => (
        <span className="text-lg font-black text-slate-900">{formatCRC(row.total_amount_crc)}</span>
      ),
    },
    {
      header: 'Estado',
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
      header: 'Fecha',
      accessor: 'created_at',
      render: (row) => (
        <span className="text-xs text-slate-400 font-medium">
          {new Date(row.created_at).toLocaleDateString('es-CR')}
        </span>
      ),
    },
  ];

  const pendingColumns: Column<PendingConsolidation>[] = [
    {
      header: 'Cliente',
      accessor: 'customer_name',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-bold text-slate-800 text-sm leading-none mb-1">{row.customer_name}</span>
          <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">{row.customer_code}</span>
        </div>
      ),
    },
    {
      header: 'Peso Total',
      accessor: 'total_weight_lb',
      align: 'center',
      render: (row) => (
        <span className="font-black text-slate-700 text-sm">{row.total_weight_lb} <span className="text-[10px] text-slate-400">lb</span></span>
      ),
    },
    {
      header: 'Paquetes',
      accessor: 'package_count',
      align: 'center',
      render: (row) => (
        <span className="bg-slate-100 text-slate-600 font-black text-xs px-3 py-1 rounded-full">{row.package_count}</span>
      ),
    },
    {
      header: 'Estado',
      accessor: 'status',
      render: (row) => (
        <span className="px-3 py-1 rounded-lg border text-[9px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border-blue-100">
          {row.status}
        </span>
      ),
    },
    {
      header: 'Preview Cobro',
      accessor: 'total_weight_lb',
      render: (row) => {
        const preview = Math.max(Number(row.total_weight_lb), 1) * 6 * 480 + 2900;
        return <span className="text-sm font-bold text-slate-500 italic">{formatCRC(preview)}</span>;
      },
    },
    {
      header: '',
      accessor: 'uuid',
      align: 'right',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleGenerateInvoice(row.uuid); }}
          disabled={isGenerating}
          className="px-4 py-2 bg-slate-900 text-white text-[10px] font-black uppercase tracking-wider rounded-xl hover:bg-slate-700 transition-all disabled:opacity-50"
        >
          {isGenerating ? 'Generando...' : 'Generar Factura'}
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

      {/* TABS */}
      <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
        {(['registros', 'por-facturar'] as ActiveBillingTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${
              activeTab === tab
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            {tab === 'registros' ? 'Registros' : 'Por Facturar'}
            {tab === 'por-facturar' && pendingConsolidations.length > 0 && (
              <span className="ml-2 bg-orange-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">
                {pendingConsolidations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {activeTab === 'registros' && (
        <>
          {/* FILTROS */}
          <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-end">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente o casillero..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-100 font-medium text-sm"
              />
            </div>
            <div className="flex gap-1 bg-slate-100/60 p-1.5 rounded-2xl">
              {(['all', 'pending', 'paid'] as PaidFilterValue[]).map((f) => (
                <button
                  key={f}
                  onClick={() => handlePaidFilterChange(f)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter transition-all ${
                    paidFilter === f
                      ? 'bg-white shadow-sm text-slate-800'
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {f === 'all' ? 'Todos' : f === 'paid' ? 'Pagados' : 'Pendientes'}
                </button>
              ))}
            </div>
          </div>

          {/* TABLA REGISTROS */}
          <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
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
        </>
      )}

      {activeTab === 'por-facturar' && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
          <NewTable
            data={pendingConsolidations}
            columns={pendingColumns}
            isLoading={isLoadingPending}
            totalRows={pendingConsolidations.length}
            currentPage={1}
            totalPages={1}
            onPageChange={() => {}}
            itemsPerPage={pendingConsolidations.length || 10}
          />
        </div>
      )}

      {/* MODAL DETALLE */}
      {selectedBillingUuid && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedBillingUuid(null)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-8 max-w-lg w-full shadow-2xl animate-in fade-in zoom-in duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {isLoadingDetail ? (
              <div className="flex justify-center py-10">
                <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin" />
              </div>
            ) : billingDetail ? (
              <>
                <div className="mb-6">
                  <Typography variant={TypographyVariant.HEADER} className="text-2xl tracking-tighter">
                    {billingDetail.customer_name}
                  </Typography>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                    {billingDetail.customer_code} · {billingDetail.customer_email}
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <BillingRow label="Consolidación" value={billingDetail.consolidation_uuid.slice(0, 8).toUpperCase()} />
                  <BillingRow label="Peso consolidación" value={`${billingDetail.total_weight_lb} lb`} />
                  <BillingRow label="Peso cobrado" value={`${billingDetail.total_weight_charged} lb`} />
                  <div className="h-px bg-slate-100 my-2" />
                  <BillingRow label="Tarifa por libra" value={`$${billingDetail.applied_rate_usd.toFixed(2)}`} />
                  <BillingRow label="Tipo de cambio" value={`₡${billingDetail.applied_exchange.toLocaleString()}`} />
                  <BillingRow label="Cargo fijo" value={formatCRC(billingDetail.applied_fee_crc)} />
                  <div className="pt-4 border-t border-dashed border-slate-200 flex justify-between items-center">
                    <span className="font-bold text-slate-800">Total a Cancelar</span>
                    <span className="text-3xl font-black text-slate-900">{formatCRC(billingDetail.total_amount_crc)}</span>
                  </div>
                </div>

                {billingDetail.package_trackings?.length > 0 && (
                  <div className="mb-6 p-4 bg-slate-50 rounded-2xl">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Trackings incluidos</p>
                    <div className="flex flex-wrap gap-1">
                      {billingDetail.package_trackings.map((t, i) => (
                        <span key={i} className="font-mono text-[10px] bg-white border border-slate-200 px-2 py-0.5 rounded-lg text-slate-600">{t}</span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-6">
                  {billingDetail.is_paid ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-xl w-full justify-center">
                      <CheckCircle2 size={16} />
                      <span className="font-black text-xs uppercase tracking-wider">Pagado</span>
                      {billingDetail.paid_at && (
                        <span className="text-[10px] text-emerald-500">· {new Date(billingDetail.paid_at).toLocaleDateString('es-CR')}</span>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-600 bg-orange-50 border border-orange-100 px-4 py-2 rounded-xl w-full justify-center animate-pulse">
                      <Clock size={16} />
                      <span className="font-black text-xs uppercase tracking-wider">Pago Pendiente</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setSelectedBillingUuid(null)}
                    className="py-3.5 bg-slate-100 text-slate-600 rounded-2xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    Cerrar
                  </button>
                  {!billingDetail.is_paid && (
                    <button
                      onClick={handleMarkAsPaid}
                      disabled={isMarkingPaid}
                      className="py-3.5 bg-emerald-600 text-white rounded-2xl font-bold text-sm hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100 disabled:opacity-50"
                    >
                      {isMarkingPaid ? 'Procesando...' : 'Marcar como Pagado'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center py-8 gap-3">
                <XCircle className="text-red-400" size={32} />
                <p className="text-slate-500 text-sm">No se pudo cargar el detalle de la factura.</p>
                <button
                  onClick={() => setSelectedBillingUuid(null)}
                  className="mt-2 px-6 py-2 bg-slate-100 rounded-xl text-sm font-bold"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const BillingRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex justify-between items-center text-sm">
    <span className="text-slate-400 font-medium">{label}</span>
    <span className="text-slate-800 font-bold">{value}</span>
  </div>
);

export default BillingContainer;
