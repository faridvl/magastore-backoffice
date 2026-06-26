import React, { useState } from 'react';
import { Search, Plus, ChevronRight, Upload, Download } from 'lucide-react';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { useCustomers } from './use-customers';
import { Customer } from '@/types/customer/customer.types';
import { ImportCustomersModal } from '../import/import-customers-modal';
import * as XLSX from 'xlsx';

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

    const [showImportModal, setShowImportModal] = useState(false);

    const handleDownloadTemplate = () => {
        const headers = [
            'cedula', 'tipo_identificacion', 'nombre', 'apellidos', 'email', 'telefono',
            'codigo_magastore', 'provincia', 'canton', 'distrito', 'direccion_exacta', 'etiqueta', 'es_principal',
        ];
        const example = [
            '123456789', 'FISICA', 'Juan', 'Pérez González', 'juan@email.com', '88881234',
            '', 'San José', 'Central', 'Carmen', 'Casa 123 frente al parque', 'Casa', 'Si',
        ];
        const ws = XLSX.utils.aoa_to_sheet([headers, example]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Clientes');
        XLSX.writeFile(wb, 'template_importacion_clientes.xlsx');
    };

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
        <>
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
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm"
                >
                    <Download size={15} />
                    Template
                </button>

                <button
                    onClick={() => setShowImportModal(true)}
                    className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 text-slate-600 rounded-2xl font-semibold text-sm hover:bg-slate-50 transition-all shadow-sm"
                >
                    <Upload size={15} />
                    Importar
                </button>

                <button
                    onClick={() => navigation.admin.customers.create()}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-900 text-white rounded-2xl font-bold text-sm hover:bg-blue-600 transition-all shadow-sm"
                >
                    <Plus size={16} />
                    Nuevo Cliente
                </button>
            </div>

            {/* CARDS (mobile) */}
            <div className="flex flex-col gap-3 md:hidden">
                {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-20" />
                    ))
                ) : customers.map((customer) => (
                    <button
                        key={customer.id}
                        onClick={() => navigation.admin.customers.detail(customer.id)}
                        className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 text-left flex items-center justify-between gap-3 hover:border-blue-100 transition-all active:scale-[0.99]"
                    >
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 text-sm truncate">{customer.first_name} {customer.last_name}</p>
                            <p className="text-[10px] font-mono font-bold text-blue-400 uppercase mt-0.5">{customer.customer_code}</p>
                            <p className="text-xs text-slate-400 mt-1 truncate">{customer.email}</p>
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${
                                customer.is_active
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}>
                                {customer.is_active ? 'Activo' : 'Inactivo'}
                            </span>
                            <span className="text-xs text-slate-400">{customer.phone}</span>
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

