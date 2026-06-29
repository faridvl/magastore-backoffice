import React from 'react';
import { Typography, TypographyVariant } from '@/components/common/typography/typography';

export interface Column<T = any> {
    header: string;
    headerRender?: () => React.ReactNode;
    accessor: keyof T | string;
    render?: (item: T) => React.ReactNode;
    align?: 'left' | 'center' | 'right';
}

interface TableProps<T> {
    columns: Column<T>[];
    data: T[];
    isLoading?: boolean;
    onRowClick?: (item: T) => void;
    // Paginación vinculada al Meta del API
    totalRows: number;
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    itemsPerPage?: number;
}

export const NewTable = <T extends { id?: string | number; uuid?: string }>({
    columns,
    data,
    isLoading,
    onRowClick,
    totalRows,
    currentPage,
    totalPages,
    onPageChange,
    itemsPerPage = 7,
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
                                    className={`px-3 py-3 md:px-6 md:py-4 border-b border-slate-100 first:rounded-tl-2xl last:rounded-tr-2xl ${col.align === 'right' ? 'text-right' : ''}`}
                                >
                                    {col.headerRender ? col.headerRender() : (
                                        <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400 font-bold tracking-widest">
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
                                    {columns.map((_, j) => (
                                        <td key={`cell-${j}`} className="px-3 py-3 md:px-6 md:py-4">
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
                                    className={`transition-all duration-200 group ${onRowClick ? 'cursor-pointer hover:bg-amber-50/30' : ''}`}
                                >
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} className={`px-3 py-3 md:px-6 md:py-4 ${col.align === 'right' ? 'text-right' : ''}`}>
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
                                <td colSpan={columns.length} className="px-6 py-20 text-center">
                                    <Typography variant={TypographyVariant.BODY_BOLD} className="text-slate-300 uppercase tracking-tighter">
                                        Sin registros
                                    </Typography>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* FOOTER DE PAGINACIÓN */}
            <div className="px-3 py-3 md:px-6 md:py-4 bg-white border-t border-slate-100 rounded-b-2xl mt-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="flex items-center justify-between md:block">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        Total Registros
                    </span>
                    <span className="text-sm font-bold text-slate-700 md:block">{totalRows}</span>
                </div>

                <div className="flex items-center justify-between gap-3">
                    <Typography variant={TypographyVariant.OVERLINE} className="text-slate-400">
                        Página {currentPage} de {totalPages || 1}
                    </Typography>
                    <div className="flex gap-2">
                        <button
                            disabled={currentPage <= 1 || isLoading}
                            onClick={() => onPageChange(currentPage - 1)}
                            className="p-2 px-4 rounded-xl border border-slate-200 text-[10px] font-black uppercase transition-all enabled:hover:bg-slate-50 disabled:opacity-30"
                        >
                            Anterior
                        </button>
                        <button
                            disabled={currentPage >= totalPages || isLoading}
                            onClick={() => onPageChange(currentPage + 1)}
                            className="p-2 px-4 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase transition-all hover:bg-slate-800 disabled:opacity-30"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};