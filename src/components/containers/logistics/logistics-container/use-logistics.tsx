import { useLogisticsQuery } from '@/shared/api/querys/logistics/use-logistics-query';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';
import { useCreateShipmentOrderWithPackagesMutation } from '@/shared/api/mutations/shipment-orders/use-create-shipment-order-with-packages-mutation';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useNotifyMultipleCustomers } from '@/hooks/use-notify-multiple-customers';
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/router';
import { OPERATIONS_ORIGIN_PARAM, OPERATIONS_ORIGIN_VALUE } from '@/shared/constants/operations';
import { toast } from 'sonner';
import { LogisticsPackage, DeliveryMethod } from '@/types/logistics/logistics.types';
import { CustomerAddress } from '@/types/customer/customer.types';

export type ViewMode = 'activos' | 'historial';
export type ConsolidationFilter = 'SIN_ORDEN' | 'CON_ORDEN';

const SELECTION_STORAGE_KEY = 'logistics:selection';

// El cliente viaja junto con los uuids: derivarlo de la página visible (como se
// hacía antes) rompía el bloqueo cross-cliente al paginar — el primer paquete
// seleccionado ya no estaba en la página actual, el cliente resolvía a null y
// se podían mezclar paquetes de varios clientes en una misma selección.
type StoredSelection = { uuids: string[]; customerId: string | null };

const EMPTY_SELECTION: StoredSelection = { uuids: [], customerId: null };

const readStoredSelection = (): StoredSelection => {
    if (typeof window === 'undefined') return EMPTY_SELECTION;
    try {
        const raw = window.sessionStorage.getItem(SELECTION_STORAGE_KEY);
        if (!raw) return EMPTY_SELECTION;
        const parsed = JSON.parse(raw);
        if (!parsed || !Array.isArray(parsed.uuids)) return EMPTY_SELECTION;
        return { uuids: parsed.uuids, customerId: parsed.customerId ?? null };
    } catch {
        return EMPTY_SELECTION;
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
    // Se lee de sessionStorage después de montar: leerla en el primer render hacía
    // que el servidor y el navegador dibujaran distinto (error de hidratación).
    const [selection, setSelection] = useState<StoredSelection>(EMPTY_SELECTION);
    const [hasRestoredSelection, setHasRestoredSelection] = useState(false);
    useEffect(() => {
        setSelection(readStoredSelection());
        setHasRestoredSelection(true);
    }, []);
    const selectedUuids = selection.uuids;
    const selectedCustomerId = selection.customerId;

    // Modal: elegir dirección de entrega + método de envío al crear la orden.
    // Siempre aparece — el método nunca se puede asumir automáticamente, aunque
    // el cliente tenga una sola dirección registrada.
    const [addressModalTarget, setAddressModalTarget] = useState<{
        customerUuid: string;
        packageUuids: string[];
        addresses: CustomerAddress[];
    } | null>(null);
    const [selectedAddressId, setSelectedAddressId] = useState('');
    const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<DeliveryMethod | null>(null);
    // null = recibe el propio cliente.
    const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(null);

    // Persiste la selección en sessionStorage — sobrevive a un "back" del navegador
    // tras entrar al detalle de un paquete, o a un refresh accidental de la pestaña.
    useEffect(() => {
        if (typeof window === 'undefined' || !hasRestoredSelection) return;
        if (selection.uuids.length === 0) {
            window.sessionStorage.removeItem(SELECTION_STORAGE_KEY);
        } else {
            window.sessionStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(selection));
        }
    }, [selection, hasRestoredSelection]);

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
    const notifyMultiple = useNotifyMultipleCustomers();

    const packages: LogisticsPackage[] = useMemo(() => data?.data || [], [data]);

    const handleViewModeChange = (mode: ViewMode) => {
        setViewMode(mode);
        setSelection(EMPTY_SELECTION);
        setPage(1);
    };

    const handleSetConsolidationFilter = (filter: ConsolidationFilter) => {
        setConsolidationFilter(filter);
        setSelection(EMPTY_SELECTION);
        setPage(1);
    };

    const setCustomerUuid = (uuid: string) => {
        setCustomerUuidState(uuid);
        setSelection(EMPTY_SELECTION);
        setPage(1);
    };

    const handleToggleSelect = (pkg: LogisticsPackage) => {
        setSelection((prev) => {
            if (prev.uuids.includes(pkg.uuid)) {
                const uuids = prev.uuids.filter((u) => u !== pkg.uuid);
                // Al vaciar la selección se libera el cliente — la próxima
                // selección puede arrancar con cualquier otro.
                return { uuids, customerId: uuids.length === 0 ? null : prev.customerId };
            }
            if (prev.customerId && pkg.customer_id !== prev.customerId) {
                toast.error('Solo puedes seleccionar paquetes del mismo cliente.');
                return prev;
            }
            return { uuids: [...prev.uuids, pkg.uuid], customerId: pkg.customer_id };
        });
    };

    const clearSelection = () => setSelection(EMPTY_SELECTION);

    // En modo selección, click en la fila/card marca el checkbox en vez de navegar
    // al detalle — evita el miss-click que antes mandaba al operador fuera de la lista.
    const handleRowClick = (pkg: LogisticsPackage, selectionModeActive: boolean) => {
        if (selectionModeActive) {
            handleToggleSelect(pkg);
        } else {
            router.push(`/admin/logistics/${pkg.uuid}`);
        }
    };

    const createOrderAndRedirect = async (
        packageUuids: string[],
        customerUuid: string,
        deliveryAddressId: string | undefined,
        deliveryMethod: DeliveryMethod,
        recipientId: string | null,
    ): Promise<boolean> => {
        try {
            const result = await createShipmentOrderWithPackages({
                customerUuid,
                packageUuids,
                deliveryAddressId,
                recipientId,
                deliveryMethod,
            });
            toast.success('Orden de envío creada correctamente');
            setSelection(EMPTY_SELECTION);
            const uuid = (result as any)?.data?.uuid;
            router.push(uuid ? `/admin/shipment-orders/${uuid}` : '/admin/shipment-orders');
            return true;
        } catch (err: any) {
            toast.error(err?.message ?? 'No se pudo crear la orden de envío.');
            return false;
        }
    };

    const handleCreateOrder = async () => {
        if (selectedUuids.length === 0 || !selectedCustomerId) return;
        try {
            const { data: addresses } = await ApiServiceClient(env.API.BASE_URL)
                .get<{ data: CustomerAddress[] }>(`/customers/${selectedCustomerId}/addresses`);

            setSelectedAddressId(addresses.find((a: CustomerAddress) => a.is_default)?.id ?? addresses[0]?.id ?? '');
            setSelectedDeliveryMethod(null);
            setSelectedRecipientId(null);
            setAddressModalTarget({ customerUuid: selectedCustomerId, packageUuids: selectedUuids, addresses });
        } catch (err: any) {
            toast.error(err?.message ?? 'No se pudo crear la orden de envío.');
        }
    };

    // Una dirección recién agregada desde el modal se elige de una vez: el
    // operador la creó justo para esta orden.
    const handleAddressesSaved = (addresses: CustomerAddress[]) => {
        const previousIds = new Set((addressModalTarget?.addresses ?? []).map((a) => a.id));
        const created = addresses.find((a) => !previousIds.has(a.id));
        setAddressModalTarget((prev) => (prev ? { ...prev, addresses } : prev));
        setSelectedAddressId((prev) => {
            if (created) return created.id;
            // Si la elegida se borró, no puede quedar una dirección que ya no existe.
            if (prev && addresses.some((a) => a.id === prev)) return prev;
            return addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? '';
        });
    };

    // En retiro en oficina no hay entrega: la orden se crea sin dirección.
    const handleConfirmCreateOrderWithAddress = async (isPickup: boolean) => {
        if (!addressModalTarget || !selectedDeliveryMethod) return;
        if (!isPickup && !selectedAddressId) return;
        const wasCreated = await createOrderAndRedirect(
            addressModalTarget.packageUuids,
            addressModalTarget.customerUuid,
            isPickup ? undefined : selectedAddressId,
            selectedDeliveryMethod,
            isPickup ? null : selectedRecipientId,
        );
        // Si falla, el modal queda como estaba para reintentar.
        if (!wasCreated) return;
        setAddressModalTarget(null);
        setSelectedAddressId('');
        setSelectedDeliveryMethod(null);
    };

    const isFromOperations = router.query[OPERATIONS_ORIGIN_PARAM] === OPERATIONS_ORIGIN_VALUE;

    return {
        isFromOperations,
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
        notifyMultiple,

        // Modal: elegir dirección de entrega + método de envío al crear la orden
        handleAddressesSaved,
        addressModalTarget,
        setAddressModalTarget,
        selectedAddressId,
        setSelectedAddressId,
        selectedDeliveryMethod,
        setSelectedDeliveryMethod,
        selectedRecipientId,
        setSelectedRecipientId,
        handleConfirmCreateOrderWithAddress,
    };
};
