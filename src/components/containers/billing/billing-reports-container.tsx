import React, { useState } from 'react';
import { BarChart3, Wallet, Check, Undo2, Info } from 'lucide-react';
import { useBillingReports } from './use-billing-reports';
import { BillingMonthlyReport, ProfitShareMonthlyReport } from '@/types/logistics/logistics.types';
import { SectionHeader } from '@/components/common/section-header/section-header';
import { currentMonthKey } from '@/shared/utils/timezone';

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

const MONTH_OPTIONS: { value: string; label: string }[] = [
  { value: '01', label: 'Enero' }, { value: '02', label: 'Febrero' }, { value: '03', label: 'Marzo' },
  { value: '04', label: 'Abril' }, { value: '05', label: 'Mayo' }, { value: '06', label: 'Junio' },
  { value: '07', label: 'Julio' }, { value: '08', label: 'Agosto' }, { value: '09', label: 'Setiembre' },
  { value: '10', label: 'Octubre' }, { value: '11', label: 'Noviembre' }, { value: '12', label: 'Diciembre' },
];

export const BillingReportsContainer: React.FC = () => {
  const {
    selectedYear, selectedMonth, applyMonthFilter,
    rows, isLoading,
    shareRows, shareRowsInRange, isLoadingShare, togglePeriodPaid, isMarkingPaid,
  } = useBillingReports();

  const currentYear = Number(currentMonthKey().split('-')[0]);
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const totalInvoiced = rows.reduce((s, r) => s + Number(r.total_invoiced_crc), 0);
  const totalPaid     = rows.reduce((s, r) => s + Number(r.total_paid_crc), 0);
  const totalPending  = rows.reduce((s, r) => s + Number(r.total_pending_crc), 0);
  const totalGanancia = rows.reduce((s, r) => s + Number(r.total_ganancia_crc), 0);
  const totalInvoices = rows.reduce((s, r) => s + r.invoice_count, 0);
  const totalUnknownCost = rows.reduce((s, r) => s + r.unknown_cost_count, 0);

  // Resumen del período: la cadena completa desde lo facturado hasta lo que
  // realmente queda. Se toma solo la participación FACTURADO — la de estimados
  // es proyección y restarla daría una utilidad neta más baja que la real.
  // Se usa la participación recortada al mes filtrado, no el historial que
  // alimenta la tabla de abajo: `totalGanancia` es de ese mes y restarle el
  // reparto de meses anteriores daría una utilidad neta que no corresponde.
  const totalFarid = shareRowsInRange.reduce((s, r) => s + Number(r.invoiced_share_crc), 0);
  const totalNeto  = totalGanancia - totalFarid;
  const faridPendiente = shareRowsInRange
    .filter((r) => !r.is_paid)
    .reduce((s, r) => s + Number(r.invoiced_share_crc), 0);

  return (
    <div className="space-y-6">

      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Mes</label>
          <select
            value={selectedMonth}
            onChange={(e) => applyMonthFilter(selectedYear, e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Año</label>
          <select
            value={selectedYear}
            onChange={(e) => applyMonthFilter(Number(e.target.value), selectedMonth)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Resumen del período: facturado → ganancia → Farid → neto.
          Es la lectura que importa de un vistazo; las tarjetas de abajo y las dos
          tablas son el desglose de estas mismas cifras. */}
      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryFigure
            label="Facturado"
            hint={`${totalInvoices} factura${totalInvoices !== 1 ? 's' : ''} confirmada${totalInvoices !== 1 ? 's' : ''} en el período`}
            value={formatCRC(totalInvoiced)}
            valueClass="text-slate-800"
          />
          <SummaryFigure
            label="Ganancia del período"
            hint="Facturado − costo courier − costo entrega"
            value={formatCRC(totalGanancia)}
            valueClass="text-amber-600"
            withArrow
          />
          <SummaryFigure
            label="Para Farid"
            hint={
              faridPendiente > 0
                ? `${formatCRC(faridPendiente)} sin pagar`
                : totalFarid > 0
                  ? 'Todo pagado'
                  : 'Sin participación facturada'
            }
            hintClass={faridPendiente > 0 ? 'text-orange-600 font-semibold' : 'text-slate-400'}
            value={formatCRC(totalFarid)}
            valueClass="text-violet-600"
            withArrow
          />
          <SummaryFigure
            label="Utilidad neta"
            hint="Lo que queda después de Farid"
            value={formatCRC(totalNeto)}
            valueClass={totalNeto >= 0 ? 'text-emerald-600' : 'text-red-500'}
            withArrow
          />
        </div>
        {totalUnknownCost > 0 && (
          <p className="mt-4 text-xs text-amber-600">
            * {totalUnknownCost} factura{totalUnknownCost !== 1 ? 's' : ''} sin el costo real de entrega confirmado: la ganancia y la utilidad neta están por encima de las reales.
          </p>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        <KpiCard
          label="Total Facturado"
          value={formatCRC(totalInvoiced)}
          color="text-slate-800"
          tooltip="Suma de todas las facturas ya emitidas (confirmadas) en el período. No incluye órdenes con solo estimado generado, aún sin facturar."
        />
        <KpiCard
          label="Pagado"
          value={formatCRC(totalPaid)}
          color="text-emerald-600"
          tooltip="Del total facturado, la parte marcada como pagada por el cliente."
        />
        <KpiCard
          label="Pendiente"
          value={formatCRC(totalPending)}
          color="text-orange-500"
          tooltip="Del total facturado, la parte que el cliente todavía no ha pagado."
        />
        <KpiCard
          label="Ganancia"
          value={formatCRC(totalGanancia)}
          color="text-amber-600"
          tooltip="Ganancia real de las facturas ya emitidas: facturado − costo courier − costo de entrega. No es una proyección — solo cuenta facturas confirmadas, con costos reales ya conocidos."
        />
        <KpiCard
          label="Facturas"
          value={String(totalInvoices)}
          color="text-amber-600"
          tooltip="Cantidad de facturas confirmadas en el período (no cuenta órdenes con solo estimado)."
        />
      </div>

      {totalUnknownCost > 0 && (
        <p className="text-xs text-amber-600 -mt-2">
          * {totalUnknownCost} factura{totalUnknownCost !== 1 ? 's' : ''} en este período no tenía{totalUnknownCost !== 1 ? 'n' : ''} el costo real de entrega confirmado al momento de facturar — la ganancia mostrada no descuenta ese costo en esos casos.
        </p>
      )}

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
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Facturas
                    <InfoTooltip text="Cantidad de facturas confirmadas emitidas ese mes." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Pagadas
                    <InfoTooltip text="De esas facturas, cuántas ya fueron marcadas como pagadas por el cliente." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Total Facturado</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Pagado</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Pendiente</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Ganancia
                    <InfoTooltip text="Ganancia real de las facturas de ese mes: facturado − costo courier − costo de entrega. Ya son costos reales conocidos, no una proyección." />
                  </span>
                </th>
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
                  <td className="px-4 py-3 text-right font-semibold text-emerald-600">{formatCRC(row.total_paid_crc)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-orange-500">{formatCRC(row.total_pending_crc)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-amber-600">{formatCRC(row.total_ganancia_crc)}</td>
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
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCRC(totalPaid)}</td>
                <td className="px-4 py-3 text-right font-bold text-orange-500">{formatCRC(totalPending)}</td>
                <td className="px-4 py-3 text-right font-bold text-amber-600">{formatCRC(totalGanancia)}</td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* Participación de Farid */}
      <ProfitShareSection
        rows={shareRows}
        isLoading={isLoadingShare}
        onTogglePaid={togglePeriodPaid}
        isMarkingPaid={isMarkingPaid}
      />
    </div>
  );
};

interface ProfitShareSectionProps {
  rows: ProfitShareMonthlyReport[];
  isLoading: boolean;
  onTogglePaid: (period: string, isPaid: boolean) => void;
  isMarkingPaid: boolean;
}

/**
 * Reparto de la utilidad, no un cargo al cliente: sale de la ganancia que ya
 * calcula el sistema. Se muestran por separado la cifra facturada (lo que
 * efectivamente se le debe pagar) y la estimada (órdenes con estimado generado
 * y todavía sin facturar), porque sumarlas contaría plata que quizá nunca entre.
 */
const ProfitShareSection: React.FC<ProfitShareSectionProps> = ({
  rows, isLoading, onTogglePaid, isMarkingPaid,
}) => {
  const totalInvoiced = rows.reduce((s, r) => s + Number(r.invoiced_share_crc), 0);
  const totalEstimated = rows.reduce((s, r) => s + Number(r.estimated_share_crc), 0);
  const totalProfitBase = rows.reduce((s, r) => s + Number(r.invoiced_profit_crc), 0);
  const totalUnknownCost = rows.reduce((s, r) => s + r.unknown_cost_count, 0);
  const sharePercent = rows.find((r) => Number(r.share_percent) > 0)?.share_percent;

  return (
    <div className="space-y-4 pt-2">
      <SectionHeader
        title={`Participación de Farid${sharePercent ? ` (${Number(sharePercent)}%)` : ''}`}
        tooltip="Participación sobre la ganancia de cada envío. Es un reparto de la utilidad — no se le cobra de más al cliente. Se registra al generar el estimado y se congela al facturar. La tabla muestra el historial completo, no solo el mes filtrado arriba."
      />

      {/* Sin tarjetas propias: las cifras del mes filtrado ya están en el
          resumen de arriba. Acá el valor está en el historial mes a mes, que
          es donde se ve qué períodos siguen sin liquidar. */}

      {totalUnknownCost > 0 && (
        <p className="text-xs text-amber-600">
          * {totalUnknownCost} orden{totalUnknownCost !== 1 ? 'es' : ''} sin el costo real de entrega confirmado — la participación mostrada no descuenta ese costo, así que queda por encima de la real.
        </p>
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Wallet className="w-6 h-6 mr-2 animate-pulse" />
            <span className="text-sm">Cargando participación...</span>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-400 gap-2">
            <Wallet className="w-8 h-8" />
            <span className="text-sm">Sin participación registrada todavía.</span>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0f1a2e] text-white">
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide">Mes</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Órdenes
                    <InfoTooltip text="Cantidad de órdenes de envío ya facturadas ese mes (no incluye órdenes con solo estimado)." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Ganancia Base
                    <InfoTooltip text="Ganancia real de esas órdenes (facturado − costo courier − costo entrega), antes de restar la participación de Farid. Es la misma cifra que 'Ganancia' en la tabla de arriba, agrupada aquí solo por órdenes con participación registrada." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Farid (Facturado)
                    <InfoTooltip text="Lo que le corresponde a Farid sobre la ganancia real ya facturada: 20% de la Ganancia Base. Plata real que se le debe pagar, no una proyección." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    Utilidad Neta
                    <InfoTooltip text="Ganancia Base menos lo que le corresponde a Farid: lo que le queda a Magastore después del reparto." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">
                  <span className="inline-flex items-center gap-1.5">
                    En Estimados
                    <InfoTooltip text="Participación proyectada de Farid sobre órdenes que ya tienen un estimado generado pero todavía NO se han facturado. Es plata que podría cambiar o nunca llegar a cobrarse — no se suma al total facturado." />
                  </span>
                </th>
                <th className="text-center px-4 py-3 font-semibold text-xs uppercase tracking-wide">Estado</th>
                <th className="text-right px-4 py-3 font-semibold text-xs uppercase tracking-wide">Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={row.period} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                  <td className="px-4 py-3 font-medium text-slate-700">{fmtMonth(row.period)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{row.invoiced_count}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCRC(row.invoiced_profit_crc)}</td>
                  <td className="px-4 py-3 text-right font-bold text-violet-600">{formatCRC(row.invoiced_share_crc)}</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    {formatCRC(Number(row.invoiced_profit_crc) - Number(row.invoiced_share_crc))}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-400">
                    {Number(row.estimated_share_crc) > 0 ? formatCRC(row.estimated_share_crc) : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.is_paid ? (
                      <span
                        className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700"
                        title={row.paid_at ? `Pagado el ${new Date(row.paid_at).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' })}${row.paid_by_name ? ` por ${row.paid_by_name}` : ''}` : undefined}
                      >
                        <Check className="w-3 h-3" /> Pagado
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-600">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      disabled={isMarkingPaid}
                      onClick={() => onTogglePaid(row.period, !row.is_paid)}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed ${
                        row.is_paid
                          ? 'border border-slate-300 text-slate-600 hover:bg-slate-100'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {row.is_paid ? (<><Undo2 className="w-3.5 h-3.5" /> Revertir</>) : (<><Check className="w-3.5 h-3.5" /> Marcar pagado</>)}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 bg-slate-100">
                <td className="px-4 py-3 font-bold text-slate-700" colSpan={2}>Total</td>
                <td className="px-4 py-3 text-right font-bold text-slate-700">{formatCRC(totalProfitBase)}</td>
                <td className="px-4 py-3 text-right font-bold text-violet-600">{formatCRC(totalInvoiced)}</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-600">{formatCRC(totalProfitBase - totalInvoiced)}</td>
                <td className="px-4 py-3 text-right font-bold text-slate-500">{formatCRC(totalEstimated)}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
};

interface SummaryFigureProps {
  label: string;
  hint: string;
  value: string;
  valueClass: string;
  hintClass?: string;
  // Marca la cifra como derivada de la anterior. La flecha solo se dibuja en
  // pantallas donde las columnas quedan efectivamente una al lado de la otra.
  withArrow?: boolean;
}

const SummaryFigure: React.FC<SummaryFigureProps> = ({
  label, hint, value, valueClass, hintClass, withArrow,
}) => (
  <div className="relative flex flex-col gap-1">
    {withArrow && (
      <span
        aria-hidden="true"
        className="hidden lg:block absolute -left-2 top-1/2 -translate-y-1/2 text-slate-300 select-none"
      >
        →
      </span>
    )}
    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">{label}</span>
    <span className={`text-2xl font-black ${valueClass}`}>{value}</span>
    <span className={`text-[11px] ${hintClass ?? 'text-slate-400'}`}>{hint}</span>
  </div>
);

interface KpiCardProps {
  label: string;
  value: string;
  color: string;
  tooltip?: string;
}

const KpiCard: React.FC<KpiCardProps> = ({ label, value, color, tooltip }) => (
  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1">
    <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
      {label}
      {tooltip && <InfoTooltip text={tooltip} />}
    </span>
    <span className={`text-xl font-black ${color}`}>{value}</span>
  </div>
);

/**
 * Mismo patrón visual del ícono de SectionHeader, pero anclable a cualquier
 * elemento inline (card, celda de encabezado de tabla) en vez de solo al
 * título de una sección completa.
 */
const InfoTooltip: React.FC<{ text: string }> = ({ text }) => {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onClick={(e) => e.preventDefault()}
        className="text-slate-400 hover:text-amber-500 transition-colors normal-case"
      >
        <Info size={12} />
      </button>
      {show && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-[70] w-56 bg-slate-800 text-white text-[11px] font-medium normal-case tracking-normal rounded-xl px-3 py-2 shadow-xl leading-snug">
          {text}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-full w-2 h-2 bg-slate-800 rotate-45 mt-1" />
        </div>
      )}
    </span>
  );
};
