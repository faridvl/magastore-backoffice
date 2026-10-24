import React, { useState } from 'react';
import { Search, Plus, ChevronRight, Upload, X } from 'lucide-react';
import { NewTable, Column } from '@/components/common/new-table/new-table';
import { Badge } from '@/components/common/badge/badge';
import { Button, ButtonVariant } from '@/components/common/button/button';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { BadgeTone } from '@/shared/constants/status-labels';
import { formatCount } from '@/shared/utils/format';
import { applyPhoneMask, idDocumentLabel } from '@/shared/utils/customer-masks';
import { useCustomers, CustomerStatusFilter } from './use-customers';
import { Customer } from '@/types/customer/customer.types';
import { ImportCustomersModal } from '../import/import-customers-modal';
import { WinBackButton } from './win-back-button';

const STATUS_FILTER_OPTIONS: { key: CustomerStatusFilter; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'active', label: 'Activos' },
    { key: 'inactive', label: 'Inactivos' },
    { key: 'win_back', label: 'Por invitar' },
];

const PAGINATION_BUTTON_CLASSNAME =
    'min-h-[44px] px-4 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 disabled:opacity-40';

const CustomerStatusBadge: React.FC<{ isActive: boolean }> = ({ isActive }) => (
    <Badge tone={isActive ? BadgeTone.SUCCESS : BadgeTone.NEUTRAL}>{isActive ? 'Activo' : 'Inactivo'}</Badge>
);

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
        handleInviteToComeBack,
        invitingCustomerId,
    } = useCustomers();

    const [showImportModal, setShowImportModal] = useState(false);

    const hasFilters = !!search || statusFilter !== 'all';
    const clearFilters = () => { setSearch(''); setStatusFilter('all'); };
    const emptyTitle = hasFilters ? 'No hay clientes con esos filtros' : 'Aún no hay clientes';
    const emptyActionLabel = hasFilters ? 'Limpiar filtros' : 'Agregar cliente';
    const handleEmptyAction = hasFilters ? clearFilters : () => navigation.admin.customers.create();

    const columns: Column<Customer>[] = [
        {
            header: 'Cliente',
            accessor: 'first_name',
            render: (row) => (
                <div className="flex flex-col min-w-0">
                    <span className="font-bold text-slate-800 text-sm leading-tight mb-1 break-words">
                        {row.first_name} {row.last_name}
                    </span>
                    <span className="text-xs font-mono font-bold text-amber-600 uppercase break-all">
                        {row.customer_code}
                    </span>
                    {/* El tipo de cliente decide cómo se le cobra el flete: verlo en
                        el listado evita entrar a la ficha para confirmarlo. */}
                    {row.customer_type_name && (
                        <span className="text-xs font-semibold text-slate-500 mt-1">
                            {row.customer_type_name}
                        </span>
                    )}
                </div>
            ),
        },
        {
            header: 'Identificación',
            accessor: 'id_card',
            // Solo desde 2xl: con el menú abierto el contenido de un iPad horizontal
            // no alcanza para esta columna sin scroll lateral. El dato sigue en la ficha.
            className: 'hidden 2xl:table-cell',
            render: (row) => (
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-700 whitespace-nowrap">{row.id_card}</span>
                    <span className="text-xs font-semibold text-slate-500">{idDocumentLabel(row.id_type)}</span>
                </div>
            ),
        },
        {
            header: 'Contacto',
            accessor: 'email',
            // Correo y teléfono en una sola columna: son el mismo dato operativo
            // (cómo contactar) y por separado desperdiciaban ancho en tablet.
            render: (row) => (
                <div className="flex flex-col min-w-0">
                    <span className="text-sm text-slate-600 font-medium break-all">{row.email}</span>
                    <span className="text-xs text-slate-500 font-medium whitespace-nowrap">{applyPhoneMask(row.phone)}</span>
                </div>
            ),
        },
        {
            header: 'Estado',
            accessor: 'is_active',
            render: (row) => (
                <div className="flex flex-col items-start gap-2">
                    <CustomerStatusBadge isActive={row.is_active} />
                    {row.win_back_pending && (
                        <WinBackButton
                            onClick={() => handleInviteToComeBack(row)}
                            isLoading={invitingCustomerId === row.id}
                        />
                    )}
                </div>
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
                        placeholder="Nombre, cédula o casillero"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full min-h-[44px] bg-slate-50 pl-10 pr-12 py-3 rounded-2xl border-none outline-none focus:ring-2 focus:ring-amber-100 font-medium text-base"
                    />
                    {search && (
                        <button
                            onClick={() => setSearch('')}
                            title="Limpiar búsqueda"
                            aria-label="Limpiar búsqueda"
                            className="absolute right-1 top-1/2 -translate-y-1/2 flex h-11 w-11 items-center justify-center text-slate-400 hover:text-slate-600 rounded-xl transition-colors"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Filtro por estado + conteo de resultados */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex gap-2 flex-wrap">
                        {STATUS_FILTER_OPTIONS.map((opt) => (
                            <button
                                key={opt.key}
                                onClick={() => setStatusFilter(opt.key)}
                                className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                                    statusFilter === opt.key
                                        ? 'bg-slate-900 text-white'
                                        : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                    {!isLoading && (
                        <span className="text-sm font-semibold text-slate-500">
                            {totalRows === totalCustomers
                                ? formatCount(totalRows, 'cliente', 'clientes')
                                : `${totalRows} de ${totalCustomers} clientes`}
                        </span>
                    )}
                </div>

                {/* Dos acciones, no tres: la plantilla se descarga desde el modal
                    de importación, que es donde tiene sentido (es su paso previo).
                    En celular "Nuevo cliente" ocupa el ancho por ser la principal. */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:items-center sm:justify-end">
                    <Button
                        variant={ButtonVariant.CANCEL}
                        onClick={() => setShowImportModal(true)}
                        className="order-2 sm:order-1"
                    >
                        <Upload size={15} />
                        Importar
                    </Button>
                    <button
                        onClick={() => navigation.admin.customers.create()}
                        className="flex items-center justify-center gap-2 px-5 min-h-[44px] bg-slate-900 text-white rounded-xl font-bold text-sm hover:bg-slate-800 transition-all shadow-sm order-1 sm:order-2"
                    >
                        <Plus size={16} />
                        Nuevo cliente
                    </button>
                </div>
            </div>

            {/* TARJETAS (celular y iPad, también con el menú abierto) */}
            <div className="flex flex-col gap-3 xl:hidden">
                {isLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="bg-white rounded-3xl border border-slate-100 shadow-sm p-4 animate-pulse h-28" />
                        ))}
                    </div>
                ) : customers.length === 0 ? (
                    <div className="bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <EmptyState
                            title={emptyTitle}
                            actionLabel={emptyActionLabel}
                            onAction={handleEmptyAction}
                            className="py-12"
                        />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {customers.map((customer) => (
                            <div key={customer.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:border-amber-100 transition-all min-w-0">
                                <button
                                    onClick={() => navigation.admin.customers.detail(customer.id)}
                                    className="w-full p-4 text-left flex items-start justify-between gap-3 active:scale-[0.99]"
                                >
                                    <div className="flex-1 min-w-0">
                                        <p className="font-bold text-slate-800 text-base leading-tight break-words">{customer.first_name} {customer.last_name}</p>
                                        <p className="text-xs font-mono font-bold text-amber-600 uppercase mt-1 break-all">{customer.customer_code}</p>
                                        <p className="text-sm text-slate-600 mt-1.5 break-all">{customer.email}</p>
                                        <p className="text-sm text-slate-500 mt-0.5 whitespace-nowrap">{applyPhoneMask(customer.phone)}</p>
                                    </div>
                                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                        <CustomerStatusBadge isActive={customer.is_active} />
                                        {customer.customer_type_name && (
                                            <span className="text-xs font-semibold text-slate-500 text-right">
                                                {customer.customer_type_name}
                                            </span>
                                        )}
                                    </div>
                                </button>
                                {/* Fuera del botón de la tarjeta: un botón no puede ir dentro de otro. */}
                                {customer.win_back_pending && (
                                    <div className="px-4 pb-4 -mt-1 flex justify-end">
                                        <WinBackButton
                                            onClick={() => handleInviteToComeBack(customer)}
                                            isLoading={invitingCustomerId === customer.id}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                {/* Paginación de tarjetas */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-2 pt-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className={PAGINATION_BUTTON_CLASSNAME}
                        >
                            Anterior
                        </button>
                        <span className="text-sm text-slate-500 font-semibold">{currentPage} / {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className={PAGINATION_BUTTON_CLASSNAME}
                        >
                            Siguiente
                        </button>
                    </div>
                )}
            </div>

            {/* TABLA (escritorio) */}
            <div className="hidden xl:block bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
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
                    itemSingular="cliente"
                    itemPlural="clientes"
                    emptyTitle={emptyTitle}
                    emptyActionLabel={emptyActionLabel}
                    onEmptyAction={handleEmptyAction}
                />
            </div>
        </div>

        {showImportModal && (
            <ImportCustomersModal onClose={() => setShowImportModal(false)} />
        )}
        </>
    );
};
