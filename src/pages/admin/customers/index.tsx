import React, { useState, useMemo } from 'react';
import Head from 'next/head';
import { DashboardLayout } from '@/components/common/layout/dashboard-layout';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { BoxedLayoutStyle } from '@/components/common/layout/boxed-container/boxed-container';
import { useNavigation } from '@/hooks/use-navigation';

const CustomersPage: React.FC = () => {
    const nav = useNavigation();
    const [search, setSearch] = useState('');

    const [customers] = useState([
        {
            id: 1,
            name: 'Alexander Pierce',
            dni: '1-1234-5678',
            email: 'a.pierce@luxury.com',
            address: 'Calle 50, Edificio Tower 2, Apto 4B',
            orders: 12,
            tier: 'VIP'
        },
        {
            id: 2,
            name: 'Isabella Ross',
            dni: '8-876-5432',
            email: 'isabella.r@fragrance.fr',
            address: 'Vía Israel, Residencial Mar del Sur',
            orders: 5,
            tier: 'Regular'
        },
        {
            id: 3,
            name: 'Julian Vancore',
            dni: 'AV-990234',
            email: 'j.vancore@style.it',
            address: 'Costa del Este, Ave. Principal, Local 12',
            orders: 28,
            tier: 'Diamond'
        },
    ]);

    const filteredCustomers = useMemo(() => {
        const query = search.toLowerCase();
        return customers.filter(c =>
            c.name.toLowerCase().includes(query) || c.dni.includes(query)
        );
    }, [search, customers]);

    return (
        <>
            <Head><title>Clientes | ScentStack</title></Head>
            <DashboardLayout isMainPage contentStyle={BoxedLayoutStyle.FULL} title="Directorio de Clientes">
                <div className="flex flex-col gap-8">

                    {/* HEADER CON ACCIÓN */}
                    <div className="flex justify-between items-end">
                        <div className="flex flex-col gap-1">
                            <Typography variant={TypographyVariant.SUBTITLE}>Gestión de Clientes</Typography>
                            <Typography variant={TypographyVariant.HELPER}>Administra perfiles, niveles de lealtad y puntos de entrega.</Typography>
                        </div>
                        <button
                            onClick={() => nav.admin.customers.create()}
                            className="bg-neutral-900 dark:bg-white dark:text-neutral-900 text-white px-8 py-4 rounded-[22px] font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-neutral-200 dark:shadow-none"
                        >
                            + Nuevo Cliente
                        </button>
                    </div>

                    {/* BUSCADOR POR NOMBRE Y CÉDULA */}
                    <div className="relative group">
                        <span className="absolute inset-y-0 left-6 flex items-center text-neutral-400 group-focus-within:text-primary transition-colors">🔍</span>
                        <input
                            type="text"
                            placeholder="Buscar por nombre o número de cédula..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-14 pr-6 py-5 bg-white dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 rounded-[24px] outline-none focus:ring-4 focus:ring-primary/5 shadow-sm font-medium transition-all"
                        />
                    </div>

                    {/* TABLA MAESTRA */}
                    <div className="bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-sm">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-neutral-50/50 dark:bg-neutral-800/30">
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Información de Cliente</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest">Dirección Principal</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Actividad</th>
                                    <th className="px-8 py-5 text-[10px] font-black uppercase text-neutral-400 tracking-widest text-center">Nivel</th>
                                    <th className="px-4 py-5"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                                {filteredCustomers.map((customer) => (
                                    <tr
                                        key={customer.id}
                                        className="group hover:bg-neutral-50/50 dark:hover:bg-neutral-800/20 transition-all cursor-pointer"
                                        onClick={() => nav.admin.customers.detail(customer.id)}
                                    >
                                        {/* NOMBRE Y CÉDULA */}
                                        <td className="px-8 py-6">
                                            <div className="flex flex-col">
                                                <Typography variant={TypographyVariant.BODY_SEMIBOLD}>{customer.name}</Typography>
                                                <Typography variant={TypographyVariant.CAPTION} className="text-neutral-400 font-mono italic">{customer.dni}</Typography>
                                            </div>
                                        </td>

                                        {/* DIRECCIÓN */}
                                        <td className="px-8 py-6 max-w-[280px]">
                                            <div className="flex items-start gap-2">
                                                <span className="text-xs">📍</span>
                                                <Typography variant={TypographyVariant.CAPTION} className="line-clamp-2 text-neutral-500 leading-relaxed">
                                                    {customer.address}
                                                </Typography>
                                            </div>
                                        </td>

                                        {/* CONTEO DE PEDIDOS */}
                                        <td className="px-8 py-6 text-center">
                                            <div className="flex flex-col items-center">
                                                <span className="text-lg font-black text-neutral-700 dark:text-neutral-200">{customer.orders}</span>
                                                <span className="text-[9px] font-black uppercase text-neutral-400 tracking-tighter">Pedidos</span>
                                            </div>
                                        </td>

                                        {/* TIER / NIVEL */}
                                        <td className="px-8 py-6 text-center">
                                            <span className={`inline-block px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${customer.tier === 'Diamond' ? 'bg-blue-50 text-blue-600 border border-blue-100' :
                                                customer.tier === 'VIP' ? 'bg-primary/10 text-primary border border-primary/10' :
                                                    'bg-neutral-100 text-neutral-500 border border-neutral-200'
                                                }`}>
                                                {customer.tier}
                                            </span>
                                        </td>

                                        {/* FLECHA DE ACCIÓN */}
                                        <td className="px-6 py-6 text-right">
                                            <span className="text-neutral-300 group-hover:text-primary group-hover:translate-x-1 transition-all inline-block font-black text-xl">
                                                →
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {filteredCustomers.length === 0 && (
                            <div className="p-20 text-center">
                                <Typography variant={TypographyVariant.HELPER}>No se encontraron clientes con esos criterios.</Typography>
                            </div>
                        )}
                    </div>
                </div>
            </DashboardLayout>
        </>
    );
};

export default CustomersPage;