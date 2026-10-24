import { formatWeight } from '@/shared/utils/format';
import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { Package, Scale, Users, RotateCcw, AlertCircle } from 'lucide-react';
import { useDashboard } from './use-dashboard';
import { PackageStatus } from '@/types/logistics/logistics.types';
import { formatCrc } from '@/shared/utils/format-crc';

const formatCRC = formatCrc;

// Recharts pide colores literales; son los de `primary` y `neutral` del tailwind.config.
const CHART_STROKE = '#3f9c85';
const CHART_FILL = '#5ec4aa';
const CHART_GRID = '#e7e5e0';
const CHART_TICK = '#9c9a94';

const STATUS_LABELS: Record<string, string> = {
  [PackageStatus.PANAMA]: 'En Panamá',
  [PackageStatus.EN_TRAMITE]: 'En trámite',
  [PackageStatus.ENTREGADO]: 'Entregado',
};

const STATUS_BADGE: Record<string, string> = {
  [PackageStatus.PANAMA]: 'bg-neutral-100 text-neutral-600',
  [PackageStatus.EN_TRAMITE]: 'bg-accent-soft text-warning-dark',
  [PackageStatus.ENTREGADO]: 'bg-primary-soft text-primary-dark',
};

const CARD = 'bg-white rounded-3xl border border-neutral-200/70 shadow-sm';

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h3 className="font-black text-neutral-900 tracking-tight">{title}</h3>
      <p className="text-neutral-500 text-xs font-semibold mt-0.5">{subtitle}</p>
    </div>
  );
}

function Shimmer({ className }: { className: string }) {
  return <div className={`bg-neutral-100 rounded-lg animate-pulse ${className}`} />;
}

export const DashboardContainer: React.FC = () => {
  const {
    stats, monthTitle, topCustomerMax, isLoading, isError, isRetrying, handleRetry,
  } = useDashboard();

  if (isError) {
    return (
      <div className={`${CARD} p-8 flex flex-col items-center text-center gap-3`}>
        <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
          <AlertCircle size={22} />
        </div>
        <p className="font-black text-neutral-900">No pudimos cargar el resumen</p>
        <p className="text-sm text-neutral-500">Revisa tu conexión e intenta de nuevo.</p>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="mt-2 min-h-[44px] px-5 rounded-xl bg-neutral-900 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60"
        >
          <RotateCcw size={16} className={isRetrying ? 'animate-spin' : undefined} />
          Reintentar
        </button>
      </div>
    );
  }

  const heroFigures = [
    {
      label: 'Ganancia',
      value: formatCRC(stats.profitThisMonthCRC),
      hint: 'del mes',
      valueClass: 'text-primary-light',
      cellClass: '',
    },
    {
      label: 'Para Farid',
      value: formatCRC(stats.faridShareThisMonthCRC),
      hint: stats.faridSharePercent > 0 ? `${stats.faridSharePercent}% de la ganancia` : 'del mes',
      valueClass: 'text-accent',
      cellClass: '',
    },
    {
      label: 'Por cobrar',
      value: formatCRC(stats.pendingBillingCRC),
      hint: 'de todos los meses',
      valueClass: 'text-white',
      cellClass: 'col-span-2 sm:col-span-1',
    },
  ];

  const volumeFigures = [
    {
      label: 'Paquetes',
      value: String(stats.packagesThisMonth),
      hint: 'este mes',
      icon: Package,
    },
    {
      label: 'Libras',
      value: formatWeight(stats.weightLbThisMonth),
      hint: 'este mes',
      icon: Scale,
    },
    {
      label: 'Clientes',
      value: String(stats.activeCustomers),
      hint: isLoading ? 'activos' : `+${stats.newCustomersThisMonth} este mes`,
      icon: Users,
    },
  ];

  return (
    <div className="pb-8 space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
        {/* Resumen del mes */}
        <section className="relative overflow-hidden rounded-3xl bg-neutral-900 text-white p-5 sm:p-7 xl:col-span-2 shadow-lg">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-28 -right-20 h-72 w-72 rounded-full bg-accent/15 blur-3xl"
          />
          <div className="relative">
            <p className="text-accent text-xs font-bold uppercase tracking-[0.2em]">{monthTitle}</p>
            <p className="mt-4 text-sm text-neutral-400">Facturado del mes</p>
            {isLoading ? (
              <div className="mt-2 h-11 w-48 rounded-lg bg-white/10 animate-pulse" />
            ) : (
              <p className="mt-1 text-4xl sm:text-5xl font-black tracking-tight tabular-nums">
                {formatCRC(stats.revenueThisMonthCRC)}
              </p>
            )}

            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-px rounded-2xl overflow-hidden bg-white/10">
              {heroFigures.map((figure) => (
                <div key={figure.label} className={`min-w-0 bg-neutral-900/95 p-3 sm:p-4 ${figure.cellClass}`}>
                  <p className="text-[11px] sm:text-xs font-semibold text-neutral-400">{figure.label}</p>
                  {isLoading ? (
                    <div className="mt-2 h-6 w-16 rounded bg-white/10 animate-pulse" />
                  ) : (
                    <p className={`mt-1 whitespace-nowrap text-base sm:text-xl font-black tabular-nums ${figure.valueClass}`}>
                      {figure.value}
                    </p>
                  )}
                  <p className="mt-0.5 text-[11px] sm:text-xs text-neutral-400 leading-snug">{figure.hint}</p>
                </div>
              ))}
            </div>

            {!isLoading && stats.unknownCostCountThisMonth > 0 && (
              <p className="mt-3 text-xs text-accent">
                {stats.unknownCostCountThisMonth === 1
                  ? 'Falta el costo de entrega de 1 factura: la ganancia es aproximada.'
                  : `Faltan los costos de entrega de ${stats.unknownCostCountThisMonth} facturas: la ganancia es aproximada.`}
              </p>
            )}
          </div>
        </section>

        {/* Volumen del mes */}
        <section className="grid grid-cols-3 xl:grid-cols-1 gap-3 sm:gap-4">
          {volumeFigures.map((figure) => (
            <div
              key={figure.label}
              className={`${CARD} p-4 sm:p-5 flex flex-col xl:flex-row xl:items-center gap-3 xl:gap-4`}
            >
              <span className="h-9 w-9 sm:h-10 sm:w-10 shrink-0 rounded-full bg-neutral-100 text-neutral-700 flex items-center justify-center">
                <figure.icon size={18} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-neutral-500">{figure.label}</p>
                {isLoading ? (
                  <Shimmer className="mt-1 h-6 w-14" />
                ) : (
                  <p className="text-base sm:text-2xl font-black text-neutral-900 tabular-nums whitespace-nowrap">
                    {figure.value}
                  </p>
                )}
                <p className="text-[11px] sm:text-xs font-semibold text-primary-dark">{figure.hint}</p>
              </div>
            </div>
          ))}
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
        {/* Facturación mensual */}
        <section className={`${CARD} p-5 sm:p-7`}>
          <SectionTitle title="Facturación mensual" subtitle="Últimos 6 meses, por fecha de factura" />
          <div className="mt-5 h-[220px] sm:h-[260px] w-full">
            {isLoading ? (
              <Shimmer className="h-full w-full rounded-2xl" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueByMonth} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={CHART_FILL} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={CHART_FILL} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke={CHART_GRID} strokeDasharray="4 4" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 600, fill: CHART_TICK }}
                    dy={8}
                    padding={{ left: 16, right: 16 }}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [formatCRC((value as number) ?? 0), 'Facturado']}
                    contentStyle={{ borderRadius: 14, border: 'none', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.15)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_STROKE}
                    strokeWidth={3}
                    fill="url(#revenueFill)"
                    dot={{ r: 3, fill: CHART_STROKE, strokeWidth: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* Mejores clientes */}
        <section className={`${CARD} p-5 sm:p-7`}>
          <SectionTitle title="Mejores clientes" subtitle="Por lo que han pagado" />
          <div className="mt-5">
            {isLoading ? (
              <div className="space-y-5">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : stats.topCustomers.length === 0 ? (
              <p className="py-10 text-center text-sm font-semibold text-neutral-500">
                Todavía no hay facturas pagadas
              </p>
            ) : (
              <ol className="space-y-5">
                {stats.topCustomers.map((customer, index) => (
                  <li key={customer.id}>
                    <div className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate font-bold text-neutral-800">
                        <span className="mr-2 text-neutral-400 tabular-nums">{index + 1}</span>
                        {customer.name}
                      </span>
                      <span className="shrink-0 font-black text-neutral-900 tabular-nums">
                        {formatCRC(customer.total)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-neutral-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${topCustomerMax > 0 ? (customer.total / topCustomerMax) * 100 : 0}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </section>
      </div>

      {/* Actividad reciente */}
      <section className={`${CARD} overflow-hidden`}>
        <div className="p-5 sm:p-7 pb-3 sm:pb-4">
          <SectionTitle title="Últimos paquetes" subtitle="Los 5 registrados más recientemente" />
        </div>
        {isLoading ? (
          <div className="px-5 sm:px-7 pb-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Shimmer key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : stats.recentPackages.length === 0 ? (
          <p className="px-5 pb-8 pt-4 text-center text-sm font-semibold text-neutral-500">
            Todavía no hay paquetes registrados
          </p>
        ) : (
          <ul className="divide-y divide-neutral-100 border-t border-neutral-100">
            {stats.recentPackages.map((pkg) => (
              <li key={pkg.uuid} className="flex items-center justify-between gap-3 px-5 sm:px-7 py-3.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-neutral-800">{pkg.customer_name}</p>
                  <p className="truncate font-mono text-xs text-neutral-500">{pkg.tracking_number}</p>
                </div>
                <span
                  className={`shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                    STATUS_BADGE[pkg.status] ?? 'bg-neutral-100 text-neutral-600'
                  }`}
                >
                  {STATUS_LABELS[pkg.status] ?? pkg.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
