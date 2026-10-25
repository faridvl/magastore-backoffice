import React from 'react';
import { BarChart3, Wallet, Check, Undo2 } from 'lucide-react';
import { useBillingReports } from './use-billing-reports';
import { BillingMonthlyReport, ProfitShareMonthlyReport } from '@/types/logistics/logistics.types';
import { Badge } from '@/components/common/badge/badge';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { BadgeTone } from '@/shared/constants/status-labels';
import { currentMonthKey, formatBusinessDate } from '@/shared/utils/timezone';
import { formatCrc } from '@/shared/utils/format-crc';
import { formatCount } from '@/shared/utils/format';
import { LoadErrorPanel } from '@/components/containers/logistics/load-error-panel';

const formatCRC = formatCrc;

const YEARS_IN_SELECTOR = 5;
const EMPTY_AMOUNT = '—';

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

const SELECT_CLASS =
  'min-h-[44px] border border-slate-300 rounded-xl px-3 py-2 text-base text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500';
const FILTER_LABEL_CLASS = 'text-sm font-semibold text-slate-600';

const TH_CLASS = 'px-4 py-3 font-semibold text-sm';
const TD_NUMBER_CLASS = 'px-4 py-3 text-right whitespace-nowrap';

// Lo pendiente es ámbar solo si hay algo pendiente: en cero es una cifra normal.
const pendingClass = (amount: number) => (amount > 0 ? 'text-amber-700' : 'text-slate-900');

const unknownCostNote = (count: number) =>
  `* ${formatCount(count, 'factura', 'facturas')} sin el costo de entrega confirmado: la ganancia está por encima de la real.`;

export const BillingReportsContainer: React.FC = () => {
  const {
    selectedYear, selectedMonth, applyMonthFilter,
    rows, isLoading, isReportError, refetchReport,
    shareRows, isLoadingShare, isShareError, refetchShare, togglePeriodPaid, isMarkingPaid,
  } = useBillingReports();

  const currentYear = Number(currentMonthKey().split('-')[0]);
  const yearOptions = Array.from({ length: YEARS_IN_SELECTOR }, (_, i) => currentYear - i);

  const totalInvoiced = rows.reduce((s, r) => s + Number(r.total_invoiced_crc), 0);
  const totalPaid     = rows.reduce((s, r) => s + Number(r.total_paid_crc), 0);
  const totalPending  = rows.reduce((s, r) => s + Number(r.total_pending_crc), 0);
  const totalGanancia = rows.reduce((s, r) => s + Number(r.total_ganancia_crc), 0);
  const totalInvoices = rows.reduce((s, r) => s + r.invoice_count, 0);
  const totalPaidCount = rows.reduce((s, r) => s + r.paid_count, 0);
  const totalUnknownCost = rows.reduce((s, r) => s + r.unknown_cost_count, 0);

  const retryAll = () => {
    refetchReport();
    refetchShare();
  };

  const showAmount = (amount: number) => (isLoading ? EMPTY_AMOUNT : formatCRC(amount));

  return (
    <div className="space-y-6">

      {/* Filtros. Se queda por mes y año (no por rango libre): la participación de Farid
          se liquida por mes completo y un rango partido daría una utilidad neta que no cuadra. */}
      <div className="flex flex-wrap items-end gap-4 bg-white border border-slate-200 rounded-xl p-4">
        <div className="flex flex-col gap-1">
          <label htmlFor="report-month" className={FILTER_LABEL_CLASS}>Mes</label>
          <select
            id="report-month"
            value={selectedMonth}
            onChange={(e) => applyMonthFilter(selectedYear, e.target.value)}
            className={SELECT_CLASS}
          >
            {MONTH_OPTIONS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="report-year" className={FILTER_LABEL_CLASS}>Año</label>
          <select
            id="report-year"
            value={selectedYear}
            onChange={(e) => applyMonthFilter(Number(e.target.value), selectedMonth)}
            className={SELECT_CLASS}
          >
            {yearOptions.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {isReportError ? (
        <LoadErrorPanel onRetry={retryAll} />
      ) : (
        <>
        {/* Resumen del período: cuatro cifras, sin repetirlas en otras tarjetas. */}
        {(isLoading || totalInvoices > 0) && (
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 text-base font-bold text-slate-800">
            Resumen de {MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label.toLowerCase()} {selectedYear}
          </h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-5 xl:grid-cols-4">
            <SummaryFigure
              label="Facturado"
              hint={isLoading ? '' : formatCount(totalInvoices, 'factura', 'facturas')}
              value={showAmount(totalInvoiced)}
              valueClass="text-slate-800"
            />
            <SummaryFigure
              label="Cobrado"
              hint={isLoading ? '' : `De lo facturado en el mes (${totalPaidCount} de ${totalInvoices})`}
              value={showAmount(totalPaid)}
              valueClass="text-emerald-700"
            />
            <SummaryFigure
              label="Por cobrar"
              hint={isLoading ? '' : `${formatCount(totalInvoices - totalPaidCount, 'factura sin pagar', 'facturas sin pagar')} del mes`}
              value={showAmount(totalPending)}
              valueClass={pendingClass(totalPending)}
            />
            <SummaryFigure
              label="Ganancia"
              hint="Facturado menos courier y entrega"
              value={showAmount(totalGanancia)}
              valueClass={totalGanancia >= 0 ? 'text-slate-900' : 'text-red-600'}
            />
          </div>
          {totalUnknownCost > 0 && (
            <p className="mt-4 text-sm text-amber-700">{unknownCostNote(totalUnknownCost)}</p>
          )}
        </div>
        )}

        {/* Detalle por mes: tabla desde xl, tarjetas antes (la tabla pasa de 860 px).
            Con un solo mes repetiría las cuatro cifras del resumen, así que no se muestra. */}
        {!isLoading && totalInvoices === 0 && (
          <PanelMessage
            icon={<BarChart3 className="w-8 h-8" />}
            text={`Aún no hay facturas en ${MONTH_OPTIONS.find((m) => m.value === selectedMonth)?.label.toLowerCase()} ${selectedYear}.`}
            isColumn
          />
        )}
        {!isLoading && rows.length > 1 && totalInvoices > 0 && (
        <div>
          <h2 className="mb-3 text-base font-bold text-slate-800">Detalle por mes</h2>
          {(
            <>
              <div className="xl:hidden grid grid-cols-1 md:grid-cols-2 gap-3">
                {rows.map((row: BillingMonthlyReport) => (
                  <div key={row.month} className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-baseline justify-between gap-3 mb-3">
                      <span className="text-base font-bold text-slate-800">{fmtMonth(row.month)}</span>
                      <span className="text-sm text-slate-500">
                        {formatCount(row.invoice_count, 'factura', 'facturas')} · {row.paid_count} {row.paid_count === 1 ? 'pagada' : 'pagadas'}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                      <MiniFigure label="Facturado" value={formatCRC(row.total_invoiced_crc)} valueClass="text-slate-800" />
                      <MiniFigure label="Cobrado" value={formatCRC(row.total_paid_crc)} valueClass="text-emerald-700" />
                      <MiniFigure label="Por cobrar" value={formatCRC(row.total_pending_crc)} valueClass={pendingClass(Number(row.total_pending_crc))} />
                      <MiniFigure label="Ganancia" value={formatCRC(row.total_ganancia_crc)} valueClass="text-slate-900" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden xl:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className={`text-left ${TH_CLASS}`}>Mes</th>
                      <th className={`text-right ${TH_CLASS}`}>Facturas</th>
                      <th className={`text-right ${TH_CLASS}`}>Pagadas</th>
                      <th className={`text-right ${TH_CLASS}`}>Facturado</th>
                      <th className={`text-right ${TH_CLASS}`}>Cobrado</th>
                      <th className={`text-right ${TH_CLASS}`}>Por cobrar</th>
                      <th className={`text-right ${TH_CLASS}`}>Ganancia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row: BillingMonthlyReport, i: number) => (
                      <tr key={row.month} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                        <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{fmtMonth(row.month)}</td>
                        <td className={`${TD_NUMBER_CLASS} text-slate-600`}>{row.invoice_count}</td>
                        <td className={`${TD_NUMBER_CLASS} text-slate-600`}>{row.paid_count}</td>
                        <td className={`${TD_NUMBER_CLASS} font-semibold text-slate-800`}>{formatCRC(row.total_invoiced_crc)}</td>
                        <td className={`${TD_NUMBER_CLASS} font-semibold text-emerald-700`}>{formatCRC(row.total_paid_crc)}</td>
                        <td className={`${TD_NUMBER_CLASS} font-semibold ${pendingClass(Number(row.total_pending_crc))}`}>{formatCRC(row.total_pending_crc)}</td>
                        <td className={`${TD_NUMBER_CLASS} font-semibold text-slate-900`}>{formatCRC(row.total_ganancia_crc)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {rows.length > 1 && (
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-100">
                        <td className="px-4 py-3 font-bold text-slate-700">Total</td>
                        <td className={`${TD_NUMBER_CLASS} font-bold text-slate-700`}>{totalInvoices}</td>
                        <td className={`${TD_NUMBER_CLASS} font-bold text-slate-700`}>
                          {rows.reduce((s, r) => s + r.paid_count, 0)}
                        </td>
                        <td className={`${TD_NUMBER_CLASS} font-bold text-slate-800`}>{formatCRC(totalInvoiced)}</td>
                        <td className={`${TD_NUMBER_CLASS} font-bold text-emerald-700`}>{formatCRC(totalPaid)}</td>
                        <td className={`${TD_NUMBER_CLASS} font-bold ${pendingClass(totalPending)}`}>{formatCRC(totalPending)}</td>
                        <td className={`${TD_NUMBER_CLASS} font-bold text-slate-900`}>{formatCRC(totalGanancia)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </>
          )}
        </div>
        )}
        </>
      )}

      {/* Participación de Farid */}
      <ProfitShareSection
        rows={shareRows}
        isLoading={isLoadingShare}
        isError={isShareError}
        onRetry={retryAll}
        onTogglePaid={togglePeriodPaid}
        isMarkingPaid={isMarkingPaid}
      />
    </div>
  );
};

interface PanelMessageProps {
  icon: React.ReactNode;
  text: string;
  isColumn?: boolean;
}

const PanelMessage: React.FC<PanelMessageProps> = ({ icon, text, isColumn }) => (
  <div className={`bg-white border border-slate-200 rounded-xl flex items-center justify-center py-16 text-slate-500 ${isColumn ? 'flex-col gap-2' : ''}`}>
    {icon}
    <span className="text-sm">{text}</span>
  </div>
);

interface ProfitShareSectionProps {
  rows: ProfitShareMonthlyReport[];
  isLoading: boolean;
  isError: boolean;
  onRetry: () => void;
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
  rows, isLoading, isError, onRetry, onTogglePaid, isMarkingPaid,
}) => {
  const totalInvoiced = rows.reduce((s, r) => s + Number(r.invoiced_share_crc), 0);
  const totalEstimated = rows.reduce((s, r) => s + Number(r.estimated_share_crc), 0);
  const totalProfitBase = rows.reduce((s, r) => s + Number(r.invoiced_profit_crc), 0);
  const totalUnknownCost = rows.reduce((s, r) => s + r.unknown_cost_count, 0);
  const sharePercent = rows.find((r) => Number(r.share_percent) > 0)?.share_percent;

  return (
    <div className="space-y-3 pt-2">
      <div>
        <h2 className="text-base font-bold text-slate-800">
          Participación de Farid{sharePercent ? ` (${Number(sharePercent)} %)` : ''}
        </h2>
        <p className="text-sm text-slate-500">
          Suma todos los meses. Sale de la ganancia, no del cliente.
        </p>
      </div>

      {totalUnknownCost > 0 && (
        <p className="text-sm text-amber-700">
          * {formatCount(totalUnknownCost, 'orden', 'órdenes')} sin el costo de entrega confirmado: la participación está por encima de la real.
        </p>
      )}

      {isError ? (
        <LoadErrorPanel onRetry={onRetry} />
      ) : isLoading ? (
        <PanelMessage icon={<Wallet className="w-6 h-6 mr-2 animate-pulse" />} text="Cargando participación..." />
      ) : rows.length === 0 ? (
        <PanelMessage icon={<Wallet className="w-8 h-8" />} text="Aún no hay participación registrada." isColumn />
      ) : (
        <>
          {/* Tarjetas hasta 2xl: esta tabla (8 columnas) no cabe antes sin desplazarse */}
          <div className="2xl:hidden grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {rows.map((row) => (
              <div key={row.period} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-base font-bold text-slate-800">{fmtMonth(row.period)}</span>
                  <PaidBadge isPaid={row.is_paid} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-3">
                  <MiniFigure label="Ganancia base" value={formatCRC(row.invoiced_profit_crc)} valueClass="text-slate-800" />
                  <MiniFigure label="Para Farid" value={formatCRC(row.invoiced_share_crc)} valueClass="text-violet-700" />
                  <MiniFigure
                    label="Utilidad neta"
                    value={formatCRC(Number(row.invoiced_profit_crc) - Number(row.invoiced_share_crc))}
                    valueClass="text-emerald-700"
                  />
                  <MiniFigure
                    label="De órdenes sin factura"
                    value={Number(row.estimated_share_crc) > 0 ? formatCRC(row.estimated_share_crc) : EMPTY_AMOUNT}
                    valueClass="text-slate-500"
                  />
                </div>
                <PaidDetail row={row} />
                <TogglePaidButton row={row} onTogglePaid={onTogglePaid} isMarkingPaid={isMarkingPaid} />
              </div>
            ))}
            <div className="md:col-span-2 xl:col-span-3 bg-slate-100 border border-slate-200 rounded-xl p-4">
              <span className="text-sm font-bold text-slate-700">Total de todos los meses</span>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-3">
                <MiniFigure label="Ganancia base" value={formatCRC(totalProfitBase)} valueClass="text-slate-800" />
                <MiniFigure label="Para Farid" value={formatCRC(totalInvoiced)} valueClass="text-violet-700" />
                <MiniFigure label="Utilidad neta" value={formatCRC(totalProfitBase - totalInvoiced)} valueClass="text-emerald-700" />
                <MiniFigure label="De órdenes sin factura" value={formatCRC(totalEstimated)} valueClass="text-slate-500" />
              </div>
            </div>
          </div>

          {/* Tabla desde 2xl */}
          <div className="hidden 2xl:block bg-white border border-slate-200 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className={`text-left ${TH_CLASS}`}>Mes</th>
                  <th className={`text-right ${TH_CLASS}`}>Facturas</th>
                  <th className={`text-right ${TH_CLASS}`}>Ganancia base</th>
                  <th className={`text-right ${TH_CLASS}`}>Para Farid</th>
                  <th className={`text-right ${TH_CLASS}`}>Utilidad neta</th>
                  <th className={`text-right ${TH_CLASS}`}>De órdenes sin factura</th>
                  <th className={`text-center ${TH_CLASS}`}>Estado</th>
                  <th className={`text-right ${TH_CLASS}`}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={row.period} className={i % 2 === 1 ? 'bg-slate-50' : 'bg-white'}>
                    <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">{fmtMonth(row.period)}</td>
                    <td className={`${TD_NUMBER_CLASS} text-slate-600`}>{row.invoiced_count}</td>
                    <td className={`${TD_NUMBER_CLASS} text-slate-600`}>{formatCRC(row.invoiced_profit_crc)}</td>
                    <td className={`${TD_NUMBER_CLASS} font-bold text-violet-700`}>{formatCRC(row.invoiced_share_crc)}</td>
                    <td className={`${TD_NUMBER_CLASS} font-bold text-emerald-700`}>
                      {formatCRC(Number(row.invoiced_profit_crc) - Number(row.invoiced_share_crc))}
                    </td>
                    <td className={`${TD_NUMBER_CLASS} text-slate-500`}>
                      {Number(row.estimated_share_crc) > 0 ? formatCRC(row.estimated_share_crc) : EMPTY_AMOUNT}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <PaidBadge isPaid={row.is_paid} />
                        <PaidDetail row={row} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <TogglePaidButton row={row} onTogglePaid={onTogglePaid} isMarkingPaid={isMarkingPaid} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-100">
                  <td className="px-4 py-3 font-bold text-slate-700" colSpan={2}>Total</td>
                  <td className={`${TD_NUMBER_CLASS} font-bold text-slate-700`}>{formatCRC(totalProfitBase)}</td>
                  <td className={`${TD_NUMBER_CLASS} font-bold text-violet-700`}>{formatCRC(totalInvoiced)}</td>
                  <td className={`${TD_NUMBER_CLASS} font-bold text-emerald-700`}>{formatCRC(totalProfitBase - totalInvoiced)}</td>
                  <td className={`${TD_NUMBER_CLASS} font-bold text-slate-500`}>{formatCRC(totalEstimated)}</td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

const PaidBadge: React.FC<{ isPaid: boolean }> = ({ isPaid }) =>
  isPaid ? (
    <Badge tone={BadgeTone.SUCCESS} icon={<Check className="w-3 h-3" />}>Pagado</Badge>
  ) : (
    <Badge tone={BadgeTone.WARNING}>Pendiente</Badge>
  );

// La autoría de este pago la registra la acción "Marcar pagado" (profit_share_periods): no pasa
// por el relleno histórico de las facturas (033), así que el nombre siempre es el de quien pagó.
const safeDecode = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const PaidDetail: React.FC<{ row: ProfitShareMonthlyReport }> = ({ row }) => {
  if (!row.is_paid || !row.paid_at) return null;
  return (
    <span className="text-sm text-slate-500">
      {formatBusinessDate(row.paid_at)}{row.paid_by_name ? ` · por ${safeDecode(row.paid_by_name)}` : ''}
    </span>
  );
};

interface TogglePaidButtonProps {
  row: ProfitShareMonthlyReport;
  onTogglePaid: (period: string, isPaid: boolean) => void;
  isMarkingPaid: boolean;
}

const TogglePaidButton: React.FC<TogglePaidButtonProps> = ({ row, onTogglePaid, isMarkingPaid }) => {
  // Regla provisional: un mes abierto todavía puede cambiar, así que no se liquida hasta cerrarlo.
  const isOpenMonth = !row.is_paid && row.period >= currentMonthKey();
  return (
    <div className="flex flex-col items-start gap-1 2xl:items-end">
      <Button
        variant={row.is_paid ? ButtonVariant.CANCEL : ButtonVariant.GHOST}
        disabled={isMarkingPaid || isOpenMonth}
        onClick={() => onTogglePaid(row.period, !row.is_paid)}
        className="whitespace-nowrap"
      >
        {row.is_paid ? (<><Undo2 className="w-4 h-4" /> Revertir</>) : (<><Check className="w-4 h-4" /> Marcar pagado</>)}
      </Button>
      {isOpenMonth && <span className="text-sm text-slate-500">Se liquida al cerrar el mes.</span>}
    </div>
  );
};

interface SummaryFigureProps {
  label: string;
  hint: string;
  value: string;
  valueClass: string;
}

const SummaryFigure: React.FC<SummaryFigureProps> = ({ label, hint, value, valueClass }) => (
  <div className="flex min-w-0 flex-col gap-1">
    <span className="text-sm font-semibold text-slate-500">{label}</span>
    <span className={`whitespace-nowrap text-xl sm:text-2xl font-black ${valueClass}`}>{value}</span>
    <span className="text-sm text-slate-500 min-h-[1.25rem]">{hint}</span>
  </div>
);

interface MiniFigureProps {
  label: string;
  value: string;
  valueClass: string;
}

const MiniFigure: React.FC<MiniFigureProps> = ({ label, value, valueClass }) => (
  <div className="flex min-w-0 flex-col">
    <span className="text-sm text-slate-500">{label}</span>
    <span className={`whitespace-nowrap text-lg font-bold ${valueClass}`}>{value}</span>
  </div>
);
