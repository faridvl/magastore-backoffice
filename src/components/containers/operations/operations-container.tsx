import React from 'react';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  AlertTriangle, PackagePlus, MessageCircle, Wallet, Check,
  ArrowRight, TrendingUp, TrendingDown, Package,
} from 'lucide-react';
import { useOperations } from './use-operations';
import { PendingReceivable } from '@/types/dashboard/operations.types';
import { routesPrivate } from '@/shared/navigation/routes';

const formatCRC = (amount: number) =>
  `₡${Math.round(amount).toLocaleString('es-CR')}`;

/**
 * Colores de las dos series del gráfico. El par ámbar/azul está validado para
 * daltonismo (ΔE 32 en protanopia) — no sustituir por ámbar/verde, que cae al
 * límite de separación.
 */
const SERIES_INVOICED = '#d97706';
const SERIES_PAID = '#2563eb';

/** A partir de cuántos días un cobro pendiente se marca como atrasado. */
const OVERDUE_DAYS = 15;

const ORDERS_ROUTE = routesPrivate.admin.shipmentOrders.index;

function InboxCardSkeleton() {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
      <div className="h-10 w-10 bg-slate-100 rounded-xl mb-4" />
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-7 w-16 bg-slate-100 rounded" />
    </div>
  );
}

interface InboxCardProps {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  tone: 'amber' | 'blue' | 'violet' | 'rose';
  /** En cero la tarjeta se apaga: no hay nada que hacer ahí. */
  isEmpty: boolean;
}

const TONE_CLASSES: Record<InboxCardProps['tone'], { bg: string; text: string }> = {
  amber: { bg: 'bg-amber-50', text: 'text-amber-600' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-600' },
  rose: { bg: 'bg-rose-50', text: 'text-rose-600' },
};

const InboxCard: React.FC<InboxCardProps> = ({
  label, value, hint, href, icon: Icon, tone, isEmpty,
}) => {
  const toneClass = isEmpty
    ? { bg: 'bg-slate-50', text: 'text-slate-300' }
    : TONE_CLASSES[tone];

  return (
    <Link
      href={href}
      className="group bg-white p-5 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all"
    >
      <div className="flex items-start justify-between">
        <div
          className={`h-10 w-10 ${toneClass.bg} ${toneClass.text} rounded-xl flex items-center justify-center mb-4`}
        >
          <Icon size={18} />
        </div>
        <ArrowRight
          size={16}
          className="text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity"
        />
      </div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
        {label}
      </p>
      <h3
        className={`text-2xl font-black mt-1 ${isEmpty ? 'text-slate-300' : 'text-slate-900'}`}
      >
        {value}
      </h3>
      <p className="text-slate-400 text-xs font-semibold mt-1">{hint}</p>
    </Link>
  );
};

/** Chip que distingue plata exigible de proyección. */
const KindChip: React.FC<{ kind: PendingReceivable['kind'] }> = ({ kind }) => (
  <span
    className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${
      kind === 'FACTURA'
        ? 'bg-blue-50 text-blue-700'
        : 'bg-slate-100 text-slate-500'
    }`}
  >
    {kind === 'FACTURA' ? 'Facturada' : 'Estimado'}
  </span>
);

interface ReceivablesTableProps {
  rows: PendingReceivable[];
  total: number;
  isLoading: boolean;
  emptyLabel: string;
  /** Filtro con el que se abre Órdenes al pedir "ver todas". */
  seeAllFilter: string;
  onMarkPaid?: (billingUuid: string) => void;
  isMarkingPaid?: boolean;
  onOpenOrder: (uuid: string) => void;
  /** Muestra el botón de notificar en vez del de marcar pagado. */
  variant: 'follow-up' | 'to-notify';
}

const ReceivablesTable: React.FC<ReceivablesTableProps> = ({
  rows, total, isLoading, emptyLabel, seeAllFilter,
  onMarkPaid, isMarkingPaid, onOpenOrder, variant,
}) => {
  const totalAmount = rows.reduce((sum, r) => sum + r.amountCRC, 0);

  if (isLoading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="h-12 w-12 bg-emerald-50 rounded-2xl flex items-center justify-center">
          <Check size={20} className="text-emerald-500" />
        </div>
        <p className="font-black text-slate-400 text-sm">{emptyLabel}</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase">
            <tr>
              <th className="px-4 py-3 md:px-6">Cliente</th>
              <th className="px-4 py-3 md:px-6">Tipo</th>
              <th className="px-4 py-3 md:px-6">Monto</th>
              <th className="px-4 py-3 md:px-6">Antigüedad</th>
              <th className="px-4 py-3 md:px-6 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {rows.map((row) => {
              const isOverdue = row.ageDays >= OVERDUE_DAYS;
              return (
                <tr
                  key={`${row.kind}-${row.consolidationUuid}`}
                  className="hover:bg-slate-50/50 transition-colors"
                >
                  <td className="px-4 py-3 md:px-6">
                    <button
                      onClick={() => onOpenOrder(row.consolidationUuid)}
                      className="text-left font-bold text-slate-700 text-sm hover:text-amber-600 transition-colors"
                    >
                      {row.customerName}
                    </button>
                    {row.customerCode && (
                      <p className="font-mono text-[11px] text-slate-400">
                        {row.customerCode}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 md:px-6">
                    <KindChip kind={row.kind} />
                  </td>
                  <td className="px-4 py-3 md:px-6 font-black text-slate-900 text-sm">
                    {formatCRC(row.amountCRC)}
                  </td>
                  <td className="px-4 py-3 md:px-6">
                    <span
                      className={`text-sm font-bold ${
                        isOverdue ? 'text-rose-600' : 'text-slate-500'
                      }`}
                    >
                      {row.ageDays === 0 ? 'Hoy' : `${row.ageDays} d`}
                    </span>
                  </td>
                  <td className="px-4 py-3 md:px-6 text-right">
                    {variant === 'follow-up' && row.billingUuid && onMarkPaid ? (
                      <button
                        onClick={() => onMarkPaid(row.billingUuid as string)}
                        disabled={isMarkingPaid}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-black hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <Check size={14} />
                        Pagado
                      </button>
                    ) : (
                      <button
                        onClick={() => onOpenOrder(row.consolidationUuid)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-slate-600 text-xs font-black hover:bg-slate-200 transition-colors"
                      >
                        {variant === 'to-notify' ? (
                          <>
                            <MessageCircle size={14} />
                            Notificar
                          </>
                        ) : (
                          'Ver orden'
                        )}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between px-4 py-3 md:px-6 border-t border-slate-50 bg-slate-50/50">
        <p className="text-xs font-bold text-slate-500">
          {rows.length === total
            ? `${total} pendiente${total !== 1 ? 's' : ''} · ${formatCRC(totalAmount)}`
            : `Mostrando ${rows.length} de ${total}`}
        </p>
        {rows.length < total && (
          <Link
            href={`${ORDERS_ROUTE}?payment=${seeAllFilter}`}
            className="text-xs font-black text-amber-600 hover:text-amber-700 inline-flex items-center gap-1"
          >
            Ver todas <ArrowRight size={13} />
          </Link>
        )}
      </div>
    </>
  );
};

export const OperationsContainer: React.FC = () => {
  const {
    stats, isLoading, isError, markReceivablePaid, isMarkingPaid, goToOrder,
  } = useOperations();

  const { inbox, monthly } = stats;

  const packageDelta = monthly.packageCount - monthly.packageCountPreviousMonth;
  const collectionRate = monthly.invoicedCRC > 0
    ? Math.round((monthly.paidCRC / monthly.invoicedCRC) * 100)
    : 0;

  if (isError) {
    return (
      <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center">
        <p className="text-sm text-red-500 font-bold">
          No se pudo cargar el panel operativo. Recarga la página.
        </p>
      </div>
    );
  }

  return (
    <div className="pb-8 space-y-6 md:space-y-8">
      {/* Bandeja de pendientes — lo que hay que hacer hoy */}
      <section>
        <h2 className="font-black text-slate-800 tracking-tight mb-1">Pendientes</h2>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">
          Cada tarjeta abre su pantalla filtrada
        </p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <InboxCardSkeleton key={i} />)
          ) : (
            <>
              <InboxCard
                label="Sin avisar al cliente"
                value={String(inbox.packagesNotNotified)}
                hint={`${inbox.customersWithPackagesNotNotified} cliente${
                  inbox.customersWithPackagesNotNotified !== 1 ? 's' : ''
                } por notificar`}
                href={routesPrivate.admin.logistics.index}
                icon={MessageCircle}
                tone="violet"
                isEmpty={inbox.packagesNotNotified === 0}
              />
              <InboxCard
                label="Sin costo cargado"
                value={String(inbox.packagesWithoutCost)}
                hint="Bloquean el cálculo de ganancia"
                href={routesPrivate.admin.logistics.index}
                icon={AlertTriangle}
                tone="rose"
                isEmpty={inbox.packagesWithoutCost === 0}
              />
              <InboxCard
                label="Sin orden de envío"
                value={String(inbox.packagesWithoutOrder)}
                hint={`${inbox.customersWithPackagesWithoutOrder} cliente${
                  inbox.customersWithPackagesWithoutOrder !== 1 ? 's' : ''
                } por agrupar`}
                href={ORDERS_ROUTE}
                icon={PackagePlus}
                tone="blue"
                isEmpty={inbox.packagesWithoutOrder === 0}
              />
              <InboxCard
                label="Por cobrar"
                value={formatCRC(inbox.pendingPaymentCRC)}
                hint={`${inbox.ordersPendingPayment} factura${
                  inbox.ordersPendingPayment !== 1 ? 's' : ''
                } sin pagar`}
                href={`${ORDERS_ROUTE}?payment=PENDIENTE_PAGO`}
                icon={Wallet}
                tone="amber"
                isEmpty={inbox.ordersPendingPayment === 0}
              />
            </>
          )}
        </div>
      </section>

      {/* Cobros por avisar — todavía no saben que deben */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-50">
          <h3 className="font-black text-slate-800 tracking-tight">Falta avisar el cobro</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            El cliente todavía no sabe cuánto debe · más antiguo primero
          </p>
        </div>
        <ReceivablesTable
          rows={stats.awaitingNotification}
          total={stats.awaitingNotificationTotal}
          isLoading={isLoading}
          emptyLabel="Todo avisado"
          seeAllFilter="SIN_NOTIFICAR"
          onOpenOrder={goToOrder}
          variant="to-notify"
        />
      </section>

      {/* Cobros notificados sin pagar — seguimiento */}
      <section className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-50">
          <h3 className="font-black text-slate-800 tracking-tight">Esperando pago</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Ya avisados · más antiguo primero
          </p>
        </div>
        <ReceivablesTable
          rows={stats.pendingReceivables}
          total={stats.pendingReceivablesTotal}
          isLoading={isLoading}
          emptyLabel="Sin cobros pendientes"
          seeAllFilter="PENDIENTE_PAGO"
          onMarkPaid={markReceivablePaid}
          isMarkingPaid={isMarkingPaid}
          onOpenOrder={goToOrder}
          variant="follow-up"
        />
      </section>

      {/* KPIs del mes */}
      <section>
        <h2 className="font-black text-slate-800 tracking-tight mb-4">Este mes</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MonthlyFigure
            label="Facturado"
            value={isLoading ? '—' : formatCRC(monthly.invoicedCRC)}
            hint="Mes calendario en curso"
          />
          <MonthlyFigure
            label="Cobrado"
            value={isLoading ? '—' : formatCRC(monthly.paidCRC)}
            hint={isLoading ? '' : `${collectionRate}% de lo facturado`}
            valueClass="text-blue-600"
          />
          <MonthlyFigure
            label="Ganancia"
            value={isLoading ? '—' : formatCRC(monthly.profitCRC)}
            hint={
              monthly.unknownCostCount > 0
                ? `${monthly.unknownCostCount} factura${
                    monthly.unknownCostCount !== 1 ? 's' : ''
                  } sin costo — cifra incompleta`
                : 'Facturado − costo courier − entrega'
            }
            hintClass={monthly.unknownCostCount > 0 ? 'text-orange-600' : undefined}
            valueClass="text-emerald-600"
          />
          <MonthlyFigure
            label="Paquetes"
            value={isLoading ? '—' : String(monthly.packageCount)}
            hint={
              isLoading
                ? ''
                : `${packageDelta >= 0 ? '+' : ''}${packageDelta} vs. mes anterior`
            }
            hintClass={packageDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}
            icon={packageDelta >= 0 ? TrendingUp : TrendingDown}
          />
        </div>
      </section>

      {/* Facturado vs. cobrado */}
      <section className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
        <div className="mb-6">
          <h3 className="font-black text-slate-800 tracking-tight">Facturado vs. Cobrado</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Últimos 6 meses · por mes de emisión
          </p>
        </div>
        <div className="h-[300px] w-full">
          {isLoading ? (
            <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
          ) : stats.revenueByMonth.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">
              Sin facturación todavía
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.revenueByMonth} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis
                  dataKey="month"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fontWeight: 700, fill: '#a3a3a3' }}
                  dy={8}
                />
                <YAxis hide />
                <Tooltip
                  cursor={{ fill: '#f8fafc' }}
                  formatter={(value, name) => [formatCRC((value as number) ?? 0), name]}
                  contentStyle={{
                    borderRadius: '16px',
                    border: 'none',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend
                  iconType="circle"
                  iconSize={9}
                  wrapperStyle={{ fontSize: 12, fontWeight: 700, paddingTop: 12 }}
                />
                <Bar
                  dataKey="invoiced"
                  name="Facturado"
                  fill={SERIES_INVOICED}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
                <Bar
                  dataKey="paid"
                  name="Cobrado"
                  fill={SERIES_PAID}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={28}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>
    </div>
  );
};

interface MonthlyFigureProps {
  label: string;
  value: string;
  hint: string;
  hintClass?: string;
  valueClass?: string;
  icon?: React.ComponentType<{ size?: number | string; className?: string }>;
}

const MonthlyFigure: React.FC<MonthlyFigureProps> = ({
  label, value, hint, hintClass, valueClass, icon: Icon = Package,
}) => (
  <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-slate-300" />
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">
        {label}
      </p>
    </div>
    <h3 className={`text-xl md:text-2xl font-black ${valueClass ?? 'text-slate-900'}`}>
      {value}
    </h3>
    <p className={`text-xs font-semibold mt-1 ${hintClass ?? 'text-slate-400'}`}>
      {hint}
    </p>
  </div>
);
