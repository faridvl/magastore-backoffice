import React from 'react';
import { BarChart3 } from 'lucide-react';
import { useBillingReports } from './use-billing-reports';
import { BillingMonthlyReport } from '@/types/logistics/logistics.types';
import { SectionHeader } from '@/components/common/section-header/section-header';

const formatCRC = (n: number) => `₡${Math.round(Number(n)).toLocaleString('es-CR')}`;

const MONTH_LABELS: Record<string, string> = {
  '01': 'Ene', '02': 'Feb', '03': 'Mar', '04': 'Abr',
  '05': 'May', '06': 'Jun', '07': 'Jul', '08': 'Ago',
  '09': 'Set', '10': 'Oct', '11': 'Nov', '12': 'Dic',
};

function fmtMonth(yyyyMm: string): string {
  const [year, month] = yyyyMm.split('-');
  return `${MONTH_LABELS[month] ?? month} ${year}`;
}

export const BillingReportsContainer: React.FC = () => {
  const { from, setFrom, to, setTo, rows, isLoading } = useBillingReports();

  const totalInvoiced = rows.reduce((s, r) => s + Number(r.total_invoiced_crc), 0);
  const totalPaid     = rows.reduce((s, r) => s + Number(r.total_paid_crc), 0);
  const totalPending  = rows.reduce((s, r) => s + Number(r.total_pending_crc), 0);
  const totalGanancia = rows.reduce((s, r) => s + Number(r.total_ganancia_crc), 0);
  const totalInvoices = rows.reduce((s, r) => s + r.invoice_count, 0);

  return (
    <div className="space-y-6">

      {/* Header */}
      <SectionHeader
        title="Reportes de Facturación"
        tooltip="Resumen mensual de ingresos facturados, pagados, pendientes y ganancia estimada por mes."
      />

      {/* Filtro de rango */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Desde</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hasta</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <KpiCard label="Total Facturado" value={formatCRC(totalInvoiced)} color="text-slate-800" />
        <KpiCard label="Pagado"          value={formatCRC(totalPaid)}     color="text-green-600" />
        <KpiCard label="Pendiente"       value={formatCRC(totalPending)}  color="text-orange-500" />
        <KpiCard label="Ganancia Est."   value={formatCRC(totalGanancia)} color="text-indigo-600" />
        <KpiCard label="Facturas"        value={String(totalInvoices)}    color="text-blue-600" />
      </div>

      {/* Tabla mensual */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <BarChart3 className="w-6 h-6 mr-2 animate-pulse" />
            <span className="text-sm">Cargando reporte...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <BarChart3 className="w-8 h-8" />
            <span className="text-sm">Sin datos para el período seleccionado.</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f1a2e] text-white">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Mes</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Facturas</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Pagadas</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Total Facturado</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Pagado</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Pendiente</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Ganancia Est.</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row: BillingMonthlyReport, i: number) => (
                <tr
                  key={row.month}
                  className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}
                >
                  <td className="px-4 py-3 font-medium text-slate-700">{fmtMonth(row.month)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.invoice_count}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.paid_count}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-800">{formatCRC(row.total_invoiced_crc)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-green-600">{formatCRC(row.total_paid_crc)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-500">{formatCRC(row.total_pending_crc)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-indigo-600">{formatCRC(row.total_ganancia_crc)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100">
                <td className="px-4 py-3 font-bold text-slate-700">Total</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">{totalInvoices}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">
                  {rows.reduce((s, r) => s + r.paid_count, 0)}
                </td>
                <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCRC(totalInvoiced)}</td>
                <td className="px-4 py-3 text-right font-bold text-green-600">{formatCRC(totalPaid)}</td>
                <td className="px-4 py-3 text-right font-bold text-orange-500">{formatCRC(totalPending)}</td>
                <td className="px-4 py-3 text-right font-bold text-indigo-600">{formatCRC(totalGanancia)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

interface KpiCardProps {
  label: string;
  value: string;
  color: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, color }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1">
    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
    <span className={`text-xl font-black ${color}`}>{value}</span>
  </div>
);
