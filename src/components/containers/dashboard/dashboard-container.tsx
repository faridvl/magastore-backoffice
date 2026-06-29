import React from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell,
} from 'recharts';
import { TrendingUp, Package, Clock, Users } from 'lucide-react';
import { useDashboard } from './use-dashboard';
import { PackageStatus } from '@/types/logistics/logistics.types';

const formatCRC = (amount: number) =>
  `₡${Math.round(amount).toLocaleString('es-CR')}`;

const STATUS_LABELS: Record<string, string> = {
  [PackageStatus.PANAMA]: 'En Panamá',
  [PackageStatus.EN_TRAMITE]: 'En Trámite',
  [PackageStatus.ENTREGADO]: 'Entregado',
};

function StatCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm animate-pulse">
      <div className="h-12 w-12 bg-slate-100 rounded-2xl mb-4" />
      <div className="h-3 w-24 bg-slate-100 rounded mb-3" />
      <div className="h-7 w-20 bg-slate-100 rounded" />
    </div>
  );
}

export const DashboardContainer: React.FC = () => {
  const { stats, isLoading, isError } = useDashboard();

  const kpiCards = [
    {
      label: 'Paquetes este mes',
      value: isLoading ? '—' : String(stats.packagesThisMonth),
      icon: Package,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
    {
      label: 'Por Cobrar',
      value: isLoading ? '—' : formatCRC(stats.pendingBillingCRC),
      icon: Clock,
      color: 'text-orange-600',
      bg: 'bg-orange-50',
    },
    {
      label: 'Ingresos del mes',
      value: isLoading
        ? '—'
        : formatCRC(
            stats.revenueByMonth.length > 0
              ? stats.revenueByMonth[stats.revenueByMonth.length - 1].revenue
              : 0,
          ),
      icon: TrendingUp,
      color: 'text-emerald-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Clientes Activos',
      value: isLoading ? '—' : String(stats.activeCustomers),
      icon: Users,
      color: 'text-amber-600',
      bg: 'bg-purple-50',
    },
  ];

  return (
    <div className="pb-8">
      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
          : kpiCards.map((stat, index) => (
              <div
                key={index}
                className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`h-10 w-10 md:h-12 md:w-12 ${stat.bg} ${stat.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4`}
                >
                  <stat.icon size={20} />
                </div>
                <p className="text-slate-500 text-[10px] md:text-sm font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mt-1">{stat.value}</h3>
              </div>
            ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
        {/* Ingresos por mes */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-slate-800 tracking-tight">Ingresos Mensuales</h3>
              <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                Últimos 6 meses — facturas pagadas
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.revenueByMonth}>
                  <defs>
                    <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1} />
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700, fill: '#a3a3a3' }}
                    dy={10}
                  />
                  <YAxis hide />
                  <Tooltip
                    formatter={(value) => [formatCRC((value as number) ?? 0), 'Ingresos']}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#colorRev)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top clientes */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="mb-6">
            <h3 className="font-black text-slate-800 tracking-tight">Top Clientes</h3>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
              Por volumen de facturación pagada
            </p>
          </div>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : stats.topCustomers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-sm font-bold">
                Sin datos de facturación aún
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.topCustomers} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f0f0f0" />
                  <XAxis type="number" hide />
                  <YAxis
                    dataKey="name"
                    type="category"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fontWeight: 700, fill: '#404040' }}
                    width={100}
                  />
                  <Tooltip
                    cursor={{ fill: '#f8fafc' }}
                    formatter={(value) => [formatCRC((value as number) ?? 0), 'Total']}
                    contentStyle={{ borderRadius: '12px' }}
                  />
                  <Bar dataKey="total" radius={[0, 10, 10, 0]} barSize={30}>
                    {stats.topCustomers.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill="#2563eb"
                        fillOpacity={1 - index * 0.18}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Banner landing */}
      <a
        href="/landing.html"
        target="_blank"
        rel="noopener noreferrer"
        className="group relative flex flex-col sm:flex-row items-center gap-6 bg-slate-900 rounded-3xl p-6 md:p-8 mb-6 md:mb-8 overflow-hidden cursor-pointer no-underline"
        style={{ textDecoration: 'none' }}
      >
        {/* Glow detrás */}
        <div className="pointer-events-none absolute -top-10 -left-10 w-48 h-48 rounded-full bg-amber-500 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />
        <div className="pointer-events-none absolute -bottom-10 right-20 w-40 h-40 rounded-full bg-amber-400 opacity-10 blur-3xl group-hover:opacity-20 transition-opacity" />

        {/* Ícono */}
        <div className="relative flex-shrink-0 w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/40 group-hover:scale-110 transition-transform">
          <Package size={32} className="text-white" />
        </div>

        {/* Texto */}
        <div className="relative flex-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full mb-2">
            <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
            Novedad para clientes
          </div>
          <h3 className="text-white font-black text-lg md:text-xl tracking-tight mb-1">
            ¿Ya conoces nuestra nueva landing para clientes?
          </h3>
          <p className="text-slate-400 text-sm">
            Comparte la propuesta de valor de Magastore con tus clientes potenciales — casillero en Miami, tarifas claras y seguimiento en tiempo real.
          </p>
        </div>

        {/* CTA */}
        <div className="relative flex-shrink-0">
          <span className="inline-flex items-center gap-2 bg-amber-500 group-hover:bg-amber-400 text-slate-900 font-black text-sm px-5 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/30 whitespace-nowrap">
            Ver landing →
          </span>
        </div>
      </a>

      {/* Actividad reciente */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-50">
          <h3 className="font-black text-slate-800 tracking-tight">Actividad Reciente</h3>
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
            Últimos 5 paquetes registrados
          </p>
        </div>

        {isError ? (
          <div className="p-8 text-center text-sm text-red-500 font-bold">
            Error al cargar los datos. Recarga la página.
          </div>
        ) : !isLoading && stats.recentPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center">
              <Package size={24} className="text-slate-300" />
            </div>
            <p className="font-black text-slate-400 text-sm">Sin actividad reciente</p>
            <p className="text-slate-300 text-xs font-bold uppercase tracking-widest">
              Los paquetes registrados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 text-[11px] font-black text-slate-400 uppercase">
                <tr>
                  <th className="px-3 py-3 md:px-6 md:py-4">Cliente</th>
                  <th className="px-3 py-3 md:px-6 md:py-4">Tracking</th>
                  <th className="px-3 py-3 md:px-6 md:py-4">Estado</th>
                  <th className="px-3 py-3 md:px-6 md:py-4">Total Factura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-slate-100 rounded animate-pulse w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : stats.recentPackages.map((pkg) => (
                      <tr
                        key={pkg.uuid}
                        className="hover:bg-slate-50/50 transition-colors"
                      >
                        <td className="px-3 py-3 md:px-6 md:py-4 font-bold text-slate-700 text-sm">
                          {pkg.customer_name}
                        </td>
                        <td className="px-3 py-3 md:px-6 md:py-4 font-mono text-xs text-slate-400">
                          {pkg.tracking_number}
                        </td>
                        <td className="px-3 py-3 md:px-6 md:py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              pkg.status === PackageStatus.ENTREGADO
                                ? 'bg-green-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {STATUS_LABELS[pkg.status] ?? pkg.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 md:px-6 md:py-4 font-black text-slate-900 text-sm">
                          {pkg.total_amount_crc != null
                            ? formatCRC(pkg.total_amount_crc)
                            : '—'}
                        </td>
                      </tr>
                    ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
