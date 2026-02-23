import React from 'react';
import Head from 'next/head';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';

const TARIFA_POR_LIBRA = 5.00; // Tu cobro al cliente
const COSTO_POR_LIBRA = 2.50;  // Lo que te cobra el flete a ti

const MOCK_BILLING = [
    { id: 101, client: 'Juan Pérez', weight: 5.2, paid: false },
    { id: 102, client: 'María López', weight: 1.5, paid: true },
    { id: 103, client: 'Carlos Ruiz', weight: 10.0, paid: false },
];

const BillingPage: React.FC = () => {
    // Cálculo automático de ganancias totales del mock
    const totalWeight = MOCK_BILLING.reduce((acc, curr) => acc + curr.weight, 0);
    const totalRevenue = totalWeight * TARIFA_POR_LIBRA;
    const totalCost = totalWeight * COSTO_POR_LIBRA;
    const netProfit = totalRevenue - totalCost;

    return (
        <>
            <Head><title>Cobros | Magastore</title></Head>
            <DashboardLayout contentStyle={BoxedLayoutStyle.FULL} title="Reporte de Cobros">
                {/* Resumen de Ganancias */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 bg-white border border-neutral-100 rounded-xl shadow-sm">
                        <p className="text-neutral-500 text-xs font-bold uppercase">Por Cobrar Total</p>
                        <p className="text-2xl font-black text-neutral-800">${totalRevenue.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-green-50 border border-green-100 rounded-xl shadow-sm">
                        <p className="text-green-600 text-xs font-bold uppercase">Ganancia Estimada</p>
                        <p className="text-2xl font-black text-green-700">${netProfit.toFixed(2)}</p>
                    </div>
                    <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl shadow-sm">
                        <p className="text-blue-600 text-xs font-bold uppercase">Total Libras</p>
                        <p className="text-2xl font-black text-blue-700">{totalWeight} lb</p>
                    </div>
                </div>

                {/* Tabla de Cobros Individuales */}
                <div className="bg-white rounded-xl shadow-sm border border-neutral-100">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 text-[12px] font-bold uppercase text-neutral-500">
                            <tr>
                                <th className="p-4">Cliente</th>
                                <th className="p-4">Peso</th>
                                <th className="p-4">A Cobrar</th>
                                <th className="p-4">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100 text-sm">
                            {MOCK_BILLING.map((item) => (
                                <tr key={item.id}>
                                    <td className="p-4 font-bold">{item.client}</td>
                                    <td className="p-4">{item.weight} lb</td>
                                    <td className="p-4 font-bold text-blue-600">${(item.weight * TARIFA_POR_LIBRA).toFixed(2)}</td>
                                    <td className="p-4">
                                        {item.paid ?
                                            <span className="text-green-600 font-bold">● Pagado</span> :
                                            <span className="text-orange-500 font-bold">○ Pendiente</span>
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </DashboardLayout>
        </>
    );
};

// export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });
export default BillingPage;