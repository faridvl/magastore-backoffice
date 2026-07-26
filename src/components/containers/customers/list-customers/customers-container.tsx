import React, { useState } from 'react';
import { Search, Plus, ChevronRight, Upload, X } from 'lucide-react';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useCustomers } from './use-customers';
import { Customer } from '@/types/customer/customer.types';
import { ImportCustomersModal } from '../import/import-customers-modal';

export const CustomersContainer: React.FC = () => {
    const {
        search,
        setSearch,
        statusFilter,
        setStatusFilter,
        currentPage,
        setCurrentPage,
        customers,
        totalRows,
        totalCustomers,
        totalPages,
        isLoading,
        navigation,
    } = useCustomers();

    const [showImportModal, setShowImportModal] = useState(false);

    const columns: Column<Customer>[] = [
        {
            header: 'Cliente',
            accessor: 'first_name',
            render: (row) => (
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-sm leading-none mb-1 truncate">
                        {row.first_name} {row.last_name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 uppercase truncate">
                        {row.customer_code}
                    </span>
                    {/* El tipo de cliente decide cómo se le cobra el flete: verlo en
                        el listado evita entrar a la ficha para confirmarlo. */}
                    {row.customer_type_name && (
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 mt-1">
                            {row.customer_type_name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Identificación',
            accessor: 'id_card',
            // Oculta bajo lg (iPad vertical): con 6 columnas el nombre y el
            // correo quedaban ilegibles. El dato sigue en la ficha del cliente.
            className: 'hidden lg:table-cell',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{row.id_card}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{row.id_type}</span>
                </div>
            ),
        },
        {
            header: 'Contacto',
            accessor: 'email',
            // Correo y teléfono en una sola columna: son el mismo dato operativo
            // (cómo contactar) y por separado desperdiciaban ancho en tablet.
            render: (row) => (
                <div className="flex flex-col min-w-0 max-w-[220px] xl:max-w-none">
                    <span className="text-sm text-slate-600 font-medium truncate" title={row.email}>{row.email}</span>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{row.phone}</span>
                </div>
            ),
        },
        {
            header: 'Estado',
            accessor: 'is_active',
            render: (row) => (
                <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border whitespace-nowrap ${
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
        <>
        <div className="flex flex-col gap-6 animate-in fade-in duration-500 pb-10">

            {/* TOOLBAR */}
            <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-3">
                {/* Búsqueda */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, cédula, casillero, correo o teléfono..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-slate-50 pl-10 pr-10 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-sm"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            title="Limpiar búsqueda"
                            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-lg transition-colors"
                        >
                            <X size={15} />
                        </button>
                    )}
                </div>

                {/* Filtro por estado + conteo de resultados */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-1.5">
                        {([
                            { key: 'all', label: 'Todos' },
                            { key: 'active', label: 'Activos' },
                            { key: 'inactive', label: 'Inactivos' },
                        ] as const).map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setStatusFilter(opt.key)}
                                className={`px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${
                                    statusFilter === opt.key
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {!isLoading && (
                        <span className="text-[11px] font-bold text-slate-400">
                            {totalRows === totalCustomers
                                ? `${totalRows} cliente${totalRows !== 1 ? 's' : ''}`
                                : `${totalRows} de ${totalCustomers}`}
                        </span>
                    )}
                </div>

                {/* Dos acciones, no tres: el template se descarga desde el modal
                    de importación, que es donde tiene sentido (es su paso previo).
                    En mobile "Nuevo Cliente" ocupa el ancho por ser la principal. */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] bg-white border border-slate-200 text-slate-600 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm order-2 sm:order-1"
                    >
                        <Upload size={15} />
                        Importar
                    </button>
                    <button
                        onClick={() => navigation.admin.customers.create()}
                        className="flex items-center justify-center gap-2 px-5 py-3 min-h-[44px] bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm order-1 sm:order-2"
                    >
                        <Plus size={16} />
                        Nuevo Cliente
                    </button>
                </div>
            </div>

            {/* CARDS (mobile) */}
            <div className="flex flex-col gap-3 md:hidden">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-20" />
                    ))
                ) : customers.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-16 gap-3">
                        <div className="h-14 w-14 bg-slate-100 rounded-2xl flex items-center justify-center">
                            <Search size={24} className="text-slate-300" />
                        </div>
                        <p className="font-black text-slate-400 text-sm">Sin clientes</p>
                        <p className="text-slate-300 text-xs font-bold uppercase tracking-widest text-center px-8">
                            {search || statusFilter !== 'all'
                                ? 'No hay clientes que coincidan con los filtros'
                                : 'Aún no hay clientes registrados'}
                        </p>
                        {(search || statusFilter !== 'all') && (
                            <button
                                onClick={() => { setSearch(''); setStatusFilter('all'); }}
                                className="mt-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[11px] font-black uppercase tracking-wider hover:bg-slate-200 transition-all"
                            >
                                Limpiar filtros
                            </button>
                        )}
                    </div>
                ) : customers.map((customer) => (
                    <button
                        key={customer.id}
                        onClick={() => navigation.admin.customers.detail(customer.id)}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex items-center justify-between gap-3 hover:border-amber-100 transition-all active:scale-[0.99]"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{customer.first_name} {customer.last_name}</p>
                            <p className="text-[10px] font-mono font-bold text-amber-400 uppercase mt-0.5 truncate">{customer.customer_code}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate">{customer.email}</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">{customer.phone}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border whitespace-nowrap ${
                                customer.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                                {customer.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                            {customer.customer_type_name && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-right">
                                    {customer.customer_type_name}
                                </span>
                            )}
                        </div>
                    </button>
                ))}
                {/* Paginación mobile */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <span className="text-xs text-slate-400 font-bold">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-600 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* TABLE (tablet+) */}
            <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
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

        {showImportModal && (
            <ImportCustomersModal onClose={() => setShowImportModal(false)} />
        )}
        </>
    );
};

