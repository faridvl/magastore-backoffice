import React from 'react';
import { Table } from '@/components/common/table/table';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { Action } from '@/components/common/menu-item/menu-item';
import { useCustomers } from './use-customers';
import { Customer } from '@/types/customer/customer.types';

export const CustomersContainer: React.FC = () => {
    const {
        search,
        setSearch,
        currentPage,
        setCurrentPage,
        customers,
        totalRows,
        itemsPerPage,
        isLoading,
        navigation
    } = useCustomers();

    // 1. Columnas alineadas con el Typography de la Tabla
    const columns = [
        { header: 'Cliente', accessor: 'full_name' },
        { header: 'Identificación', accessor: 'id_card' },
        { header: 'Correo Electrónico', accessor: 'email' },
        { header: 'Teléfono', accessor: 'phone' },
        { header: 'Estado', accessor: 'status_label' },
    ];

    // 2. Definición de Acciones basada en tu interfaz 'Action'
    // Nota: Usamos 'label' si tu ToggleMenu lo espera así, o 'name' según tu definición de tipo Action
    const tableActions: Action[] = [
        {
            name: 'Ver Detalles', // Cambiar a 'name' si tu interfaz usa estrictamente name
            icon: <span className="text-lg">👁️</span>,
            onClick: (customer: Customer) => navigation.admin.customers.detail(customer.id)
        },
        {
            name: 'Editar Cliente',
            icon: <span className="text-lg">✏️</span>,
            onClick: (customer: Customer) => console.log('Editando cliente:', customer.id)
        }
    ];

    return (
        <div className="flex flex-col gap-8">
            {/* SECCIÓN DE TÍTULO */}
            <div className="flex justify-between items-end">
                <div className="flex flex-col gap-1">
                    <Typography variant={TypographyVariant.SUBTITLE}>
                        Gestión de Clientes
                    </Typography>
                </div>

                <Button
                    variant={ButtonVariant.PRIMARY}
                    onClick={() => navigation.admin.customers.create()}
                    className="px-8 rounded-[22px]"
                >
                    + Nuevo Cliente
                </Button>
            </div>

            {/* BARRA DE BÚSQUEDA */}
            <div className="relative group">
                <span className="absolute inset-y-0 left-6 flex items-center text-slate-400 group-focus-within:text-primary transition-colors">
                    🔍
                </span>
                <input
                    type="text"
                    placeholder="Buscar por nombre, cédula o código..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[20px] outline-none focus:ring-4 focus:ring-primary/5 shadow-sm transition-all"
                />
            </div>

            {/* TABLA DE DATOS */}
            <Table
                columns={columns}
                data={customers}
                currentPage={currentPage}
                totalRows={totalRows}
                onPageChange={setCurrentPage}
                itemsPerPage={itemsPerPage}
                actions={tableActions}
                isLoading={isLoading}
                onRowClick={(customer: Customer) => navigation.admin.customers.detail(customer.id)}
            />
        </div>
    );
};