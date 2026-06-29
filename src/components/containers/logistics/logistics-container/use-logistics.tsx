import { useLogisticsQuery } from '@/shared/api/querys/logistics/use-logistics-query';
import { useState, useEffect } from 'react';

export type ViewMode = 'activos' | 'historial';

export const usePackages = (pageSize = 7) => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('activos');
    const [statusFilter, setStatusFilter] = useState('PANAMA');
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    const resolvedStatus = viewMode === 'historial'
        ? 'ENTREGADO'
        : statusFilter === 'ALL' ? 'ACTIVOS' : statusFilter;

    const { data, isLoading } = useLogisticsQuery(
        page, pageSize, debouncedSearch, resolvedStatus,
        dateFrom || undefined, dateTo || undefined,
    );

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setStatusFilter('ALL');
        setPage(1);
    };

    return {
        packages: data?.data || [],
        isLoading,
        meta: {
            total: data?.meta.total || 0,
            page: page,
            limit: pageSize,
            totalPages: data?.meta.totalPages || 1
        },
        viewMode,
        setViewMode: handleViewModeChange,
        statusFilter,
        setStatusFilter: (s: string) => { setStatusFilter(s); setPage(1); },
        handlePageChange: setPage,
        handleSearch: setSearch,
        dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setPage(1); },
        dateTo, setDateTo: (v: string) => { setDateTo(v); setPage(1); },
    };
};
