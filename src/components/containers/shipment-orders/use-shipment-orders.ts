import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useShipmentOrdersQuery } from '@/shared/api/querys/shipment-orders/use-shipment-orders-query';
import { useShipmentOrderDetailQuery } from '@/shared/api/querys/shipment-orders/use-shipment-order-detail-query';
import { useAvailablePackagesQuery } from '@/shared/api/querys/shipment-orders/use-available-packages-query';
import { useCreateShipmentOrderMutation } from '@/shared/api/mutations/shipment-orders/use-create-shipment-order-mutation';
import { useUpdateShipmentOrderStatusMutation } from '@/shared/api/mutations/shipment-orders/use-update-shipment-order-status-mutation';
import { useAssignPackagesMutation } from '@/shared/api/mutations/shipment-orders/use-assign-packages-mutation';
import { useDeleteShipmentOrderMutation } from '@/shared/api/mutations/shipment-orders/use-delete-shipment-order-mutation';
import { ConsolidationListItem, ConsolidationStatus, DeliveryMethod } from '@/types/logistics/logistics.types';
import { Customer } from '@/types/customer/customer.types';
import { PaginatedResponse } from '@/types/paginate.types';

export type ShipmentOrderStatusFilter = 'ALL' | ConsolidationStatus;

const PAGE_SIZE = 10;

export const useShipmentOrders = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ShipmentOrderStatusFilter>(ConsolidationStatus.ABIERTO);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);

  // Modal: crear orden de envío
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCustomerUuid, setCreateCustomerUuid] = useState('');
  const [createCustomerSearch, setCreateCustomerSearch] = useState('');

  // Modal: asignar paquetes
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPackageUuids, setSelectedPackageUuids] = useState<string[]>([]);

  // Delete confirmation
  const [deleteUuid, setDeleteUuid] = useState<string | null>(null);

  // Quick-action confirmation (reopen / dispatch)
  const [quickActionTarget, setQuickActionTarget] = useState<{ uuid: string; action: 'reopen' | 'dispatch' } | null>(null);

  // Pre-billing
  const [showPreBillingModal, setShowPreBillingModal] = useState(false);
  const [preBillingDeliveryMethod, setPreBillingDeliveryMethod] = useState<DeliveryMethod>('RETIRO');
  const [isGeneratingPreBilling, setIsGeneratingPreBilling] = useState(false);
  const [isConfirmingPreBilling, setIsConfirmingPreBilling] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const listQuery = useShipmentOrdersQuery(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
    statusFilter,
    dateFrom || undefined,
    dateTo || undefined,
  );
  const { data: listData, isLoading: isLoadingList } = listQuery.useQuery();

  const detailQuery = useShipmentOrderDetailQuery(selectedUuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();

  const availableQuery = useAvailablePackagesQuery(
    detailResponse?.data?.customer_id ?? '',
  );
  const { data: availableResponse, isLoading: isLoadingAvailable } = availableQuery.useQuery();

  const { data: customersData } = useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', 'dropdown'],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/customers?limit=100'),
    staleTime: 1000 * 60 * 5,
    enabled: showCreateModal,
  });

  const { data: openShipmentOrderCheck } = useQuery<{ hasOpen: boolean; uuid?: string }>({
    queryKey: ['shipment-orders', 'check-open', createCustomerUuid],
    queryFn: () =>
      ApiServiceClient(env.API.BASE_URL).get(
        `/consolidations?action=check-open&customerUuid=${createCustomerUuid}`,
      ),
    enabled: showCreateModal && !!createCustomerUuid,
    staleTime: 0,
  });

  const filteredCustomers = useMemo(() => {
    const all = customersData?.data ?? [];
    if (!createCustomerSearch) return all;
    const q = createCustomerSearch.toLowerCase();
    return all.filter(
      (c) =>
        c.first_name?.toLowerCase().includes(q) ||
        c.last_name?.toLowerCase().includes(q) ||
        c.customer_code?.toLowerCase().includes(q),
    );
  }, [customersData, createCustomerSearch]);

  const { createShipmentOrder, isPending: isCreating } = useCreateShipmentOrderMutation();
  const { updateStatus, isPending: isUpdating } = useUpdateShipmentOrderStatusMutation();
  const { assignPackages, isPending: isAssigning } = useAssignPackagesMutation();
  const { deleteShipmentOrder, isPending: isDeleting } = useDeleteShipmentOrderMutation();

  const handleConfirmDelete = async () => {
    if (!deleteUuid) return;
    try {
      await deleteShipmentOrder({ uuid: deleteUuid });
      setDeleteUuid(null);
      if (selectedUuid === deleteUuid) setSelectedUuid(null);
      toast.success('Orden de envío eliminada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo eliminar la orden de envío.');
    }
  };

  const handleConfirmQuickAction = async () => {
    if (!quickActionTarget) return;
    const { uuid, action } = quickActionTarget;
    try {
      if (action === 'reopen') {
        await updateStatus({ consolidationUuid: uuid, status: ConsolidationStatus.ABIERTO, currentStatus: ConsolidationStatus.CERRADO });
        toast.success('Orden de envío reabierta');
      } else {
        await updateStatus({ consolidationUuid: uuid, status: ConsolidationStatus.ENTREGADO, currentStatus: ConsolidationStatus.CERRADO });
        toast.success('Orden de envío marcada como entregada');
      }
      setQuickActionTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo completar la acción.');
    }
  };

  const handleStatusFilterChange = (val: ShipmentOrderStatusFilter) => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleSelectRow = (item: ConsolidationListItem) => {
    setSelectedUuid(item.uuid);
    setSelectedPackageUuids([]);
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
    setCreateCustomerUuid('');
    setCreateCustomerSearch('');
  };

  const handleConfirmCreate = async () => {
    if (!createCustomerUuid) return;
    try {
      await createShipmentOrder({ customerUuid: createCustomerUuid });
      setShowCreateModal(false);
      setCreateCustomerUuid('');
      setCreateCustomerSearch('');
      toast.success('Orden de envío creada');
    } catch (err: any) {
      toast.error('No se pudo crear la orden de envío. Intenta de nuevo.');
    }
  };

  const handleAdvanceStatus = async () => {
    if (!detailResponse?.data) return;
    const { uuid, status } = detailResponse.data;
    const nextMap: Record<ConsolidationStatus, ConsolidationStatus | null> = {
      [ConsolidationStatus.ABIERTO]: ConsolidationStatus.CERRADO,
      [ConsolidationStatus.CERRADO]: ConsolidationStatus.ENTREGADO,
      [ConsolidationStatus.ENTREGADO]: null,
    };
    const next = nextMap[status];
    if (!next) return;
    try {
      await updateStatus({ consolidationUuid: uuid, status: next, currentStatus: status });
      // Al despachar la orden de envío, despachar también todos sus paquetes
      if (next === ConsolidationStatus.ENTREGADO) {
        const packageUuids = detailResponse.data.packages.map((p) => p.uuid);
        if (packageUuids.length > 0) {
          await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=bulk-status', {
            packageUuids,
            status: 'ENTREGADO',
          });
        }
      }
      await detailQuery.invalidate();
      await listQuery.invalidate();
      toast.success(`Estado actualizado a ${next}`);
    } catch (err: any) {
      toast.error('No se pudo avanzar el estado de la orden de envío. Intenta de nuevo.');
    }
  };

  const handleOpenAssignModal = () => {
    setSelectedPackageUuids([]);
    setShowAssignModal(true);
  };

  const handleTogglePackage = (uuid: string) => {
    setSelectedPackageUuids((prev) =>
      prev.includes(uuid) ? prev.filter((u) => u !== uuid) : [...prev, uuid],
    );
  };

  const handleConfirmAssign = async () => {
    if (!selectedUuid || selectedPackageUuids.length === 0) return;
    try {
      await assignPackages({ consolidationUuid: selectedUuid, packageUuids: selectedPackageUuids });
      setShowAssignModal(false);
      setSelectedPackageUuids([]);
      await detailQuery.invalidate();
      await listQuery.invalidate();
      await availableQuery.invalidate();
      toast.success('Paquetes asignados correctamente');
    } catch (err: any) {
      toast.error('No se pudieron asignar los paquetes. Verifica que pertenezcan al cliente de esta orden de envío.');
    }
  };

  const handleGeneratePreBilling = async () => {
    if (!selectedUuid) return;
    setIsGeneratingPreBilling(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=pre-billing', {
        consolidationUuid: selectedUuid,
        deliveryMethod: preBillingDeliveryMethod,
      });
      await detailQuery.invalidate();
      toast.success('Prefactura generada correctamente');
      setShowPreBillingModal(false);
    } catch (err: any) {
      toast.error('No se pudo generar la prefactura. Intenta de nuevo.');
    } finally {
      setIsGeneratingPreBilling(false);
    }
  };

  const handleDownloadPreBillingPDF = async (preBillingUuid: string, customerCode: string) => {
    try {
      const response = await fetch(`/api/billing/pre-billing-pdf?uuid=${preBillingUuid}`);
      if (!response.ok) throw new Error('No se pudo generar el PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `estimado-${customerCode}-${preBillingUuid.slice(-8).toUpperCase()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo.');
    }
  };

  const handleConfirmPreBilling = async () => {
    if (!selectedUuid) return;
    setIsConfirmingPreBilling(true);
    try {
      await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=confirm-pre-billing', {
        consolidationUuid: selectedUuid,
      });
      await detailQuery.invalidate();
      await listQuery.invalidate();
      toast.success('Prefactura confirmada y factura generada');
    } catch (err: any) {
      const msg = err?.message || 'No se pudo confirmar la prefactura.';
      toast.error(msg);
    } finally {
      setIsConfirmingPreBilling(false);
    }
  };

  return {
    // List
    page, setPage,
    search, setSearch,
    statusFilter, handleStatusFilterChange,
    dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setPage(1); },
    dateTo, setDateTo: (v: string) => { setDateTo(v); setPage(1); },
    shipmentOrders: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,

    // Detail panel
    selectedUuid, setSelectedUuid,
    shipmentOrderDetail: detailResponse?.data ?? null,
    isLoadingDetail,

    // Status advance
    handleAdvanceStatus, isUpdating,

    // Create modal
    showCreateModal, setShowCreateModal,
    createCustomerUuid, setCreateCustomerUuid,
    createCustomerSearch, setCreateCustomerSearch,
    handleOpenCreateModal,
    handleConfirmCreate,
    isCreating,

    // Assign packages modal
    showAssignModal, setShowAssignModal,
    availablePackages: availableResponse?.data ?? [],
    isLoadingAvailable,
    selectedPackageUuids,
    handleTogglePackage,
    handleOpenAssignModal,
    handleConfirmAssign,
    isAssigning,

    // Customers dropdown (for create modal)
    filteredCustomers,
    openShipmentOrderCheck,

    // Row click
    handleSelectRow,

    // Pre-billing
    showPreBillingModal, setShowPreBillingModal,
    preBillingDeliveryMethod, setPreBillingDeliveryMethod,
    handleGeneratePreBilling,
    isGeneratingPreBilling,
    handleConfirmPreBilling,
    isConfirmingPreBilling,
    handleDownloadPreBillingPDF,

    // Delete
    deleteUuid, setDeleteUuid,
    handleConfirmDelete,
    isDeleting,

    // Quick actions (reopen / dispatch)
    quickActionTarget, setQuickActionTarget,
    handleConfirmQuickAction,
  };
};
