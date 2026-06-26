import React from 'react';
import { Search, Plus, ChevronRight } from 'lucide-react';
import { NewTable, Column } from '@/components/common/new-table/new-table';
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
        totalPages,
        isLoading,
        navigation,
    } = useCustomers();

    const columns: Column<Customer>[] = [
        {
            header: 'Cliente',
            accessor: 'first_name',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-sm leading-none mb-1">
                        {row.first_name} {row.last_name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-blue-400 uppercase">
                        {row.customer_code}
                    </span>
                </div>
            ),
        },
        {
            header: 'Identificación',
            accessor: 'id_card',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700">{row.id_card}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{row.id_type}</span>
                </div>
            ),
        },
        {
            header: 'Correo',
            accessor: 'email',
            render: (row) => (
                <span className="text-sm text-slate-600 font-medium">{row.email}</span>
            ),
        },
        {
            header: 'Teléfono',
            accessor: 'phone',
            render: (row) => (
                <span className="text-sm text-slate-600 font-medium">{row.phone}</span>
            ),
        },
        {
            header: 'Estado',
            accessor: 'is_active',
            render: (row) => (
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                    row.is_active
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                        : 'bg-slate-50 text-slate-500 border-slate-200'
                }`}>
                    {row.is_active ? 'Activo' : 'Inactivo'}
                </span>
            ),
        },
        {
            header: '',
            accessor: 'id',
            align: 'right',
            render: () => <ChevronRight size={16} className="text-slate-300" />,
        },
    ];

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

            {/* TOOLBAR */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-wrap gap-4 items-end">
                <div className="relative flex-1 min-w-[250px]">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula o casillero..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 pl-10 pr-4 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-blue-100 font-medium text-sm"
                    />
                </div>

                <button
                    onClick={() => navigation.admin.customers.create()}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-sm"
                >
                    <Plus size={16} />
                    Nuevo Cliente
                </button>
            </div>

            {/* TABLE */}
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
                <NewTable
                    data={customers}
                    columns={columns}
                    isLoading={isLoading}
                    totalRows={totalRows}
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    onRowClick={(customer) => navigation.admin.customers.detail(customer.id)}
                    itemsPerPage={10}
                />
            </div>
        </div>
    );
};
