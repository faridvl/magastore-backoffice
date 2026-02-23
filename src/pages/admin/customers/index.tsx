import React from 'react';
import { authorizeServerSidePage } from '@/hocs/auth';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import Head from 'next/head';
import { useNavigation } from '@/hooks/use-navigation'; // Asegúrate de que la ruta sea correcta

const CustomersPage: React.FC = () => {
    const nav = useNavigation();

    // Datos de ejemplo basados en una boutique de perfumes
    const mockCustomers = [
        { id: 1, name: 'Alexander Pierce', email: 'a.pierce@luxury.com', orders: 12, spent: '$15,400', tier: 'VIP' },
        { id: 2, name: 'Isabella Ross', email: 'isabella.r@fragrance.fr', orders: 5, spent: '$3,200', tier: 'Regular' },
        { id: 3, name: 'Julian Vancore', email: 'j.vancore@style.it', orders: 28, spent: '$42,100', tier: 'Diamond' },
    ];

    return (
        <>
            <Head><title>Clientes | ScentStack Admin</title></Head>
            <DashboardLayout
                isMainPage={true}
                contentStyle={BoxedLayoutStyle.FULL}
                title="Directorio de Clientes"
            >
                <div className="flex flex-col gap-6">
                    {/* Header de la sección interna */}
                    <div className="flex flex-col gap-1">
                        <Typography variant={TypographyVariant.SUBTITLE}>Gestión de Clientes</Typography>
                        <Typography variant={TypographyVariant.HELPER}>
                            Visualiza y gestiona la base de datos de tus compradores y sus niveles de lealtad.
                        </Typography>
                    </div>

                    {/* Tabla de Clientes */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50 dark:bg-neutral-800/50">
                                    <th className="px-8 py-5">
                                        <Typography variant={TypographyVariant.OVERLINE}>Nombre del Cliente</Typography>
                                    </th>
                                    <th className="px-8 py-5">
                                        <Typography variant={TypographyVariant.OVERLINE}>Nivel</Typography>
                                    </th>
                                    <th className="px-8 py-5">
                                        <Typography variant={TypographyVariant.OVERLINE}>Pedidos</Typography>
                                    </th>
                                    <th className="px-8 py-5 text-right">
                                        <Typography variant={TypographyVariant.OVERLINE}>Inversión Total</Typography>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {mockCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        // NAVEGACIÓN HABILITADA AQUÍ
                                        onClick={() => nav.admin.customers.detail(customer.id)}
                                        className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors cursor-pointer"
                                    >
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col">
                                                <Typography variant={TypographyVariant.BODY_SEMIBOLD}>
                                                    {customer.name}
                                                </Typography>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-neutral-400">
                                                    {customer.email}
                                                </Typography>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${customer.tier === 'VIP' || customer.tier === 'Diamond'
                                                ? 'bg-primary/10 text-primary'
                                                : 'bg-neutral-100 text-neutral-500'
                                                }`}>
                                                {customer.tier}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            <Typography variant={TypographyVariant.BODY}>
                                                {customer.orders} compras
                                            </Typography>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Typography variant={TypographyVariant.BODY_BOLD} textColor="text-primary">
                                                {customer.spent}
                                            </Typography>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default CustomersPage;