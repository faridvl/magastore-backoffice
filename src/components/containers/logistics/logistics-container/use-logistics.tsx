import { useLogisticsQuery } from '@/shared/api/querys/logistics/use-logistics-query';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';
import { useCreateShipmentOrderWithPackagesMutation } from '@/shared/api/mutations/shipment-orders/use-create-shipment-order-with-packages-mutation';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { LogisticsPackage } from '@/types/logistics/logistics.types';

export type ViewMode = 'activos' | 'historial';
export type ConsolidationFilter = 'SIN_ORDEN' | 'CON_ORDEN';

const SELECTION_STORAGE_KEY = 'logistics:selectedUuids';

const readStoredSelection = (): string[] => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.sessionStorage.getItem(SELECTION_STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

export const usePackages = (pageSize = 7) => {
    const router = useRouter();
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<ViewMode>('activos');
    const [consolidationFilter, setConsolidationFilter] = useState<ConsolidationFilter>('SIN_ORDEN');
    const [customerUuid, setCustomerUuidState] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState(search);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [selectedUuids, setSelectedUuids] = useState<string[]>(readStoredSelection);

    // Persiste la selección en sessionStorage — sobrevive a un "back" del navegador
    // tras entrar al detalle de un paquete, o a un refresh accidental de la pestaña.
    useEffect(() => {
        if (typeof window === 'undefined') return;
        if (selectedUuids.length === 0) {
            window.sessionStorage.removeItem(SELECTION_STORAGE_KEY);
        } else {
            window.sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selectedUuids));
        }
    }, [selectedUuids]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 400);
        return () => clearTimeout(handler);
    }, [search]);

    const resolvedStatus = viewMode === 'historial' ? 'ENTREGADO' : 'ACTIVOS';
    const resolvedConsolidationFilter = viewMode === 'activos' ? consolidationFilter : undefined;

    const { data, isLoading } = useLogisticsQuery(
        page, pageSize, debouncedSearch, resolvedStatus,
        dateFrom || undefined, dateTo || undefined,
        resolvedConsolidationFilter, customerUuid || undefined,
    );

    const { data: customersData } = useCustomersQuery();
    const customers = customersData?.data ?? [];

    const { createShipmentOrderWithPackages, isPending: isCreatingOrder } = useCreateShipmentOrderWithPackagesMutation();

    const packages: LogisticsPackage[] = useMemo(() => data?.data || [], [data]);

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setSelectedUuids([]);
        setPage(1);
    };

    const handleSetConsolidationFilter = (filter: ConsolidationFilter) => {
        setConsolidationFilter(filter);
        setSelectedUuids([]);
        setPage(1);
    };

    const setCustomerUuid = (uuid: string) => {
        setCustomerUuidState(uuid);
        setSelectedUuids([]);
        setPage(1);
    };

    // Cliente de la selección actual — bloquea selección cross-cliente
    const selectedCustomerId = useMemo(() => {
        if (selectedUuids.length === 0) return null;
        const first = packages.find((p) => p.uuid === selectedUuids[0]);
        return first?.customer_id ?? null;
    }, [selectedUuids, packages]);

    const handleToggleSelect = (pkg: LogisticsPackage) => {
        setSelectedUuids((prev) => {
            if (prev.includes(pkg.uuid)) {
                return prev.filter((u) => u !== pkg.uuid);
            }
            if (selectedCustomerId && pkg.customer_id !== selectedCustomerId) {
                toast.error('Solo puedes seleccionar paquetes del mismo cliente.');
                return prev;
            }
            return [...prev, pkg.uuid];
        });
    };

    const clearSelection = () => setSelectedUuids([]);

    // En modo selección, click en la fila/card marca el checkbox en vez de navegar
    // al detalle — evita el miss-click que antes mandaba al operador fuera de la lista.
    const handleRowClick = (pkg: LogisticsPackage, selectionModeActive: boolean) => {
        if (selectionModeActive) {
            handleToggleSelect(pkg);
        } else {
            router.push(`/admin/logistics/${pkg.uuid}`);
        }
    };

    const handleCreateOrder = async () => {
        if (selectedUuids.length === 0 || !selectedCustomerId) return;
        try {
            const result = await createShipmentOrderWithPackages({
                customerUuid: selectedCustomerId,
                packageUuids: selectedUuids,
            });
            toast.success('Orden de envío creada correctamente');
            setSelectedUuids([]);
            const uuid = (result as any)?.data?.uuid;
            router.push(uuid ? `/admin/shipment-orders?uuid=${uuid}` : '/admin/shipment-orders');
        } catch (err: any) {
            toast.error(err?.message ?? 'No se pudo crear la orden de envío.');
        }
    };

    return {
        packages,
        isLoading,
        meta: {
            total: data?.meta.total || 0,
            page: page,
            limit: pageSize,
            totalPages: data?.meta.totalPages || 1
        },
        viewMode,
        setViewMode: handleViewModeChange,
        consolidationFilter,
        setConsolidationFilter: handleSetConsolidationFilter,
        customers,
        customerUuid,
        setCustomerUuid,
        handlePageChange: setPage,
        handleSearch: setSearch,
        dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setPage(1); },
        dateTo, setDateTo: (v: string) => { setDateTo(v); setPage(1); },
        selectedUuids,
        selectedCustomerId,
        handleToggleSelect,
        handleRowClick,
        clearSelection,
        handleCreateOrder,
        isCreatingOrder,
    };
};
