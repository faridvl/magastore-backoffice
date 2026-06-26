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
  [PackageStatus.MIAMI]: 'Miami',
  [PackageStatus.TRANSITO]: 'En Tránsito',
  [PackageStatus.ADUANA]: 'En Aduana',
  [PackageStatus.BODEGA_CR]: 'Bodega CR',
  [PackageStatus.ENTREGADO]: 'Entregado',
};

function StatCardSkeleton() {
  return (
    <div className="bg-white p-6 rounded-3xl border border-neutral-100 shadow-sm animate-pulse">
      <div className="h-12 w-12 bg-neutral-100 rounded-2xl mb-4" />
      <div className="h-3 w-24 bg-neutral-100 rounded mb-3" />
      <div className="h-7 w-20 bg-neutral-100 rounded" />
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
      color: 'text-blue-600',
      bg: 'bg-blue-50',
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
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: 'Clientes Activos',
      value: isLoading ? '—' : String(stats.activeCustomers),
      icon: Users,
      color: 'text-purple-600',
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
                className="bg-white p-4 md:p-6 rounded-2xl md:rounded-3xl border border-neutral-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className={`h-10 w-10 md:h-12 md:w-12 ${stat.bg} ${stat.color} rounded-xl md:rounded-2xl flex items-center justify-center mb-3 md:mb-4`}
                >
                  <stat.icon size={20} />
                </div>
                <p className="text-neutral-500 text-[10px] md:text-sm font-bold uppercase tracking-wider">
                  {stat.label}
                </p>
                <h3 className="text-xl md:text-2xl font-black text-neutral-900 mt-1">{stat.value}</h3>
              </div>
            ))}
      </div>

      {/* Gráficas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 mb-6 md:mb-8">
        {/* Ingresos por mes */}
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-black text-neutral-800 tracking-tight">Ingresos Mensuales</h3>
              <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">
                Últimos 6 meses — facturas pagadas
              </p>
            </div>
          </div>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-neutral-50 rounded-2xl animate-pulse" />
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
        <div className="bg-white p-5 md:p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <div className="mb-6">
            <h3 className="font-black text-neutral-800 tracking-tight">Top Clientes</h3>
            <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">
              Por volumen de facturación pagada
            </p>
          </div>
          <div className="h-[300px] w-full">
            {isLoading ? (
              <div className="h-full w-full bg-neutral-50 rounded-2xl animate-pulse" />
            ) : stats.topCustomers.length === 0 ? (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm font-bold">
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

      {/* Actividad reciente */}
      <div className="bg-white rounded-3xl border border-neutral-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-neutral-50">
          <h3 className="font-black text-neutral-800 tracking-tight">Actividad Reciente</h3>
          <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mt-1">
            Últimos 5 paquetes registrados
          </p>
        </div>

        {isError ? (
          <div className="p-8 text-center text-sm text-red-500 font-bold">
            Error al cargar los datos. Recarga la página.
          </div>
        ) : !isLoading && stats.recentPackages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <div className="h-14 w-14 bg-neutral-100 rounded-2xl flex items-center justify-center">
              <Package size={24} className="text-neutral-300" />
            </div>
            <p className="font-black text-neutral-400 text-sm">Sin actividad reciente</p>
            <p className="text-neutral-300 text-xs font-bold uppercase tracking-widest">
              Los paquetes registrados aparecerán aquí
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-neutral-50 text-[11px] font-black text-neutral-400 uppercase">
                <tr>
                  <th className="px-3 py-3 md:px-6 md:py-4">Cliente</th>
                  <th className="px-3 py-3 md:px-6 md:py-4">Tracking</th>
                  <th className="px-3 py-3 md:px-6 md:py-4">Estado</th>
                  <th className="px-3 py-3 md:px-6 md:py-4">Total Factura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50">
                {isLoading
                  ? Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i}>
                        {Array.from({ length: 4 }).map((__, j) => (
                          <td key={j} className="px-6 py-4">
                            <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
                          </td>
                        ))}
                      </tr>
                    ))
                  : stats.recentPackages.map((pkg) => (
                      <tr
                        key={pkg.uuid}
                        className="hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="px-3 py-3 md:px-6 md:py-4 font-bold text-neutral-700 text-sm">
                          {pkg.customer_name}
                        </td>
                        <td className="px-3 py-3 md:px-6 md:py-4 font-mono text-xs text-neutral-400">
                          {pkg.tracking_number}
                        </td>
                        <td className="px-3 py-3 md:px-6 md:py-4">
                          <span
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                              pkg.status === PackageStatus.ENTREGADO
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {STATUS_LABELS[pkg.status] ?? pkg.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 md:px-6 md:py-4 font-black text-neutral-900 text-sm">
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
