import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Search, Package, ArrowUpRight } from 'lucide-react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

interface CustomerHistoryTabProps {
    seasonalityData: any[];
    filteredHistory: any[];
    setSearchTerm: (term: string) => void;
}

export const CustomerHistoryTab: React.FC<CustomerHistoryTabProps> = ({
    seasonalityData,
    filteredHistory,
    setSearchTerm
}) => {
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Gráfico de Actividad */}
            <div className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Volumen de Importación</Typography>
                        <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-medium">Libras procesadas por mes en el último año</Typography>
                    </div>
                    <div className="p-2 bg-primary/5 text-primary rounded-xl">
                        <Package size={20} />
                    </div>
                </div>

                <div className="h-[220px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={seasonalityData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="8 8" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                axisLine={false}
                                tickLine={false}
                                tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
                                dy={10}
                            />
                            <Tooltip
                                cursor={{ fill: '#f8fafc', radius: 8 }}
                                contentStyle={{
                                    borderRadius: '16px',
                                    border: 'none',
                                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)',
                                    padding: '12px'
                                }}
                                itemStyle={{ fontWeight: '800', fontSize: '12px' }}
                            />
                            <Bar dataKey="lbs" radius={[6, 6, 6, 6]} barSize={24}>
                                {seasonalityData.map((e: any, i: number) => (
                                    <Cell
                                        key={i}
                                        fill={e.lbs > 30 ? 'var(--color-primary, #2563eb)' : '#e2e8f0'}
                                        className="transition-all duration-300 hover:opacity-80"
                                    />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Tabla de Paquetes */}
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden text-sm">
                <div className="p-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-50">
                    <div>
                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-lg">Historial de Paquetes</Typography>
                        <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 font-medium">Listado detallado de transacciones</Typography>
                    </div>

                    <div className="relative group w-full md:w-auto">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors" size={16} />
                        <input
                            onChange={(e) => setSearchTerm(e.target.value)}
                            placeholder="Buscar por tracking..."
                            className="pl-11 pr-4 py-3 bg-slate-50 border border-transparent rounded-2xl text-xs outline-none focus:bg-white focus:border-primary/20 focus:ring-4 focus:ring-primary/5 transition-all w-full md:w-72 font-medium"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50">
                                {['Fecha de Ingreso', 'Número de Tracking', 'Inversión Total', 'Estado'].map((h) => (
                                    <th key={h} className="px-8 py-4 text-left">
                                        <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-bold tracking-widest">{h}</Typography>
                                    </th>
                                ))}
                                <th className="px-8 py-4 text-right"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredHistory.map((item) => (
                                <tr key={item.id} className="hover:bg-slate-50/30 transition-all duration-200 group">
                                    <td className="px-8 py-5">
                                        <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="text-slate-600 italic">
                                            {item.date}
                                        </Typography>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="flex flex-col">
                                            <Typography variant={TypographyVariant.BODY_BOLD} className="text-primary tracking-tight">
                                                {item.tracking}
                                            </Typography>
                                            <Typography variant={TypographyVariant.CAPTION} className="text-slate-400 text-[10px] font-bold uppercase">
                                                Courier Internacional
                                            </Typography>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5">
                                        <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-800">
                                            ₡{item.total.toLocaleString()}
                                        </Typography>
                                    </td>
                                    <td className="px-8 py-5">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/5 text-primary rounded-lg">
                                            <div className="w-1 h-1 rounded-full bg-primary" />
                                            <Typography variant={TypographyVariant.OVERLINE} className="font-black">
                                                {item.status}
                                            </Typography>
                                        </div>
                                    </td>
                                    <td className="px-8 py-5 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 hover:bg-white rounded-lg border border-slate-100 shadow-sm text-slate-400 hover:text-primary transition-all">
                                            <ArrowUpRight size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredHistory.length === 0 && (
                    <div className="p-20 text-center">
                        <Typography variant={TypographyVariant.BODY} className="text-slate-400 italic">No se encontraron paquetes con ese criterio.</Typography>
                    </div>
                )}
            </div>
        </div>
    );
};