import React from 'react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';
import { EmptyState } from '@/components/common/empty-state/empty-state';
import { formatCount } from '@/shared/utils/format';

export interface Column<T = any> {
    header: string;
    headerRender?: () => React.ReactNode;
    accessor: keyof T | string;
    render?: (item: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
    /** Clases extra para th y td — ej: 'hidden xl:table-cell' para ocultar la columna en pantallas angostas (iPad) */
    className?: string;
    /** Ancho mínimo de la columna (px o cualquier medida CSS) para que el contenido no se apriete. */
    minWidth?: number | string;
    /** Evita que el contenido de la celda se parta en varias líneas (badges, códigos, montos). */
    noWrap?: boolean;
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    rowClassName?: (item: T) => string;
    // Paginación vinculada al Meta del API
    totalRows: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage?: number;
    /** Sustantivo del conteo del pie: "10 órdenes". */
    itemSingular?: string;
    itemPlural?: string;
    emptyTitle?: string;
    /** El conteo ya se muestra en otro lugar de la pantalla (p. ej. la tarjeta de filtros). */
    hideCount?: boolean;
    emptyActionLabel?: string;
    onEmptyAction?: () => void;
}

const cellStyle = <T,>(col: Column<T>): React.CSSProperties | undefined =>
    col.minWidth === undefined ? undefined : { minWidth: col.minWidth };

export const NewTable = <T extends { id?: string | number; uuid?: string }>({
    columns,
    data,
    isLoading,
    onRowClick,
    rowClassName,
    totalRows,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage = 7,
    itemSingular = 'registro',
    itemPlural = 'registros',
    emptyTitle = 'No hay resultados',
    hideCount = false,
    emptyActionLabel,
    onEmptyAction,
}: TableProps<T>) => {
    const skeletonRows = Array(itemsPerPage).fill(0);

    return (
        <div className="w-full flex flex-col h-full">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-0">
                    <thead>
                        <tr className="bg-slate-50/80">
                            {columns.map((col, index) => (
                                <th
                                    key={index}
                                    style={cellStyle(col)}
                                    className={`px-3 py-3 md:px-4 md:py-4 xl:px-6 border-b border-slate-100 first:rounded-tl-2xl last:rounded-tr-2xl ${col.align === 'right' ? 'text-right' : ''} ${col.className ?? ''}`}
                                >
                                    {col.headerRender ? col.headerRender() : (
                                        <Typography variant={TypographyVariant.OVERLINE} className="text-slate-500">
                                            {col.header}
                                        </Typography>
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {isLoading ? (
                            skeletonRows.map((_, i) => (
                                <tr key={`skeleton-${i}`}>
                                    {columns.map((col, j) => (
                                        <td key={`cell-${j}`} style={cellStyle(col)} className={`px-3 py-3 md:px-4 md:py-4 xl:px-6 ${col.className ?? ''}`}>
                                            <div className="h-4 bg-slate-100 rounded animate-pulse w-full" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : data.length > 0 ? (
                            data.map((item, rowIndex) => (
                                <tr
                                    key={item.uuid || item.id || rowIndex}
                                    onClick={() => onRowClick?.(item)}
                                    className={`transition-all duration-200 group ${onRowClick ? 'cursor-pointer hover:bg-amber-50/30' : ''} ${rowClassName?.(item) ?? ''}`}
                                >
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} style={cellStyle(col)} className={`px-3 py-3 md:px-4 md:py-4 xl:px-6 ${col.align === 'right' ? 'text-right' : ''} ${col.noWrap ? 'whitespace-nowrap' : ''} ${col.className ?? ''}`}>
                                            {col.render ? col.render(item) : (
                                                <span className="text-sm text-slate-600 font-medium">
                                                    {String(item[col.accessor as keyof T] || '-')}
                                                </span>
                                            )}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={columns.length}>
                                    <EmptyState title={emptyTitle} actionLabel={emptyActionLabel} onAction={onEmptyAction} />
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* FOOTER DE PAGINACIÓN */}
            <div className="px-3 py-3 md:px-4 md:py-4 xl:px-6 bg-white border-t border-slate-100 rounded-b-2xl mt-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <span className="text-sm font-bold text-slate-700">
                    {hideCount ? '' : isLoading ? '—' : formatCount(totalRows, itemSingular, itemPlural)}
                </span>

                <div className="flex items-center justify-between gap-3">
                    <Typography variant={TypographyVariant.OVERLINE} className="text-slate-500">
                        Página {currentPage} de {totalPages || 1}
                    </Typography>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage <= 1 || isLoading}
                            onClick={() => onPageChange(currentPage - 1)}
                            className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold transition-all enabled:hover:bg-slate-50 disabled:opacity-30"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={currentPage >= totalPages || isLoading}
                            onClick={() => onPageChange(currentPage + 1)}
                            className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold transition-all hover:bg-slate-800 disabled:opacity-30"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};