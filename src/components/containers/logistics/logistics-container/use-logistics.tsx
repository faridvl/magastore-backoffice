import { useLogisticsQuery } from '@/shared/api/querys/logistics/use-logistics-query';
import { useState, useEffect } from 'react';

export const usePackages = (pageSize = 7) => {
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [debouncedSearch, setDebouncedSearch] = useState(search);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    const { data, isLoading } = useLogisticsQuery(page, pageSize, debouncedSearch, statusFilter);

    return {
        packages: data?.data || [],
        isLoading,
        meta: {
            total: data?.meta.total || 0,
            page: page,
            limit: pageSize,
            totalPages: data?.meta.totalPages || 1
        },
        statusFilter,
        setStatusFilter: (s: string) => { setStatusFilter(s); setPage(1); },
        handlePageChange: setPage,
        handleSearch: setSearch
    };
};