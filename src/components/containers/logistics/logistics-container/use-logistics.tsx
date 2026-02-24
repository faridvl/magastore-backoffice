import { useLogisticsQuery } from '@/shared/api/querys/logistics/use-logistics-query';
import { useState } from 'react';

export const usePackages = (pageSize = 7) => { // Ahora acepta el tamaño por parámetro
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Usamos pageSize para la petición al API
    const { data, isLoading } = useLogisticsQuery(page, pageSize, search, statusFilter);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
    };

    const handleSearch = (value: string) => {
        setSearch(value);
        setPage(1);
    };

    const handleStatusChange = (newStatus: string) => {
        setStatusFilter(newStatus);
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
        statusFilter,
        setStatusFilter: handleStatusChange,
        handlePageChange,
        handleSearch
    };
};