import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useConsolidationsQuery } from '@/shared/api/querys/consolidations/use-consolidations-query';
import { useConsolidationDetailQuery } from '@/shared/api/querys/consolidations/use-consolidation-detail-query';
import { useAvailablePackagesQuery } from '@/shared/api/querys/consolidations/use-available-packages-query';
import { useCreateConsolidationMutation } from '@/shared/api/mutations/consolidations/use-create-consolidation-mutation';
import { useUpdateConsolidationStatusMutation } from '@/shared/api/mutations/consolidations/use-update-consolidation-status-mutation';
import { useAssignPackagesMutation } from '@/shared/api/mutations/consolidations/use-assign-packages-mutation';
import { ConsolidationListItem, ConsolidationStatus } from '@/types/logistics/logistics.types';
import { Customer } from '@/types/customer/customer.types';
import { PaginatedResponse } from '@/types/paginate.types';

export type ConsolidationStatusFilter = 'ALL' | ConsolidationStatus;

const PAGE_SIZE = 10;

export const useConsolidations = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ConsolidationStatusFilter>('ALL');

  const [selectedUuid, setSelectedUuid] = useState<string | null>(null);

  // Modal: crear consolidación
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createCustomerUuid, setCreateCustomerUuid] = useState('');
  const [createCustomerSearch, setCreateCustomerSearch] = useState('');

  // Modal: asignar paquetes
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedPackageUuids, setSelectedPackageUuids] = useState<string[]>([]);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const listQuery = useConsolidationsQuery(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
    statusFilter,
  );
  const { data: listData, isLoading: isLoadingList } = listQuery.useQuery();

  const detailQuery = useConsolidationDetailQuery(selectedUuid ?? '');
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

  const { createConsolidation, isPending: isCreating } = useCreateConsolidationMutation();
  const { updateStatus, isPending: isUpdating } = useUpdateConsolidationStatusMutation();
  const { assignPackages, isPending: isAssigning } = useAssignPackagesMutation();

  const handleStatusFilterChange = (val: ConsolidationStatusFilter) => {
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
    await createConsolidation({ customerUuid: createCustomerUuid });
    setShowCreateModal(false);
    setCreateCustomerUuid('');
    setCreateCustomerSearch('');
  };

  const handleAdvanceStatus = async () => {
    if (!detailResponse?.data) return;
    const { uuid, status } = detailResponse.data;
    const nextMap: Record<ConsolidationStatus, ConsolidationStatus | null> = {
      [ConsolidationStatus.ABIERTO]: ConsolidationStatus.CERRADO,
      [ConsolidationStatus.CERRADO]: ConsolidationStatus.DESPACHADO,
      [ConsolidationStatus.DESPACHADO]: ConsolidationStatus.ENTREGADO,
      [ConsolidationStatus.ENTREGADO]: null,
    };
    const next = nextMap[status];
    if (!next) return;
    await updateStatus({
      consolidationUuid: uuid,
      status: next,
      currentStatus: status,
    });
    await detailQuery.invalidate();
    await listQuery.invalidate();
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
    await assignPackages({
      consolidationUuid: selectedUuid,
      packageUuids: selectedPackageUuids,
    });
    setShowAssignModal(false);
    setSelectedPackageUuids([]);
    await detailQuery.invalidate();
    await listQuery.invalidate();
    await availableQuery.invalidate();
  };

  return {
    // List
    page, setPage,
    search, setSearch,
    statusFilter, handleStatusFilterChange,
    consolidations: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,

    // Detail panel
    selectedUuid, setSelectedUuid,
    consolidationDetail: detailResponse?.data ?? null,
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

    // Row click
    handleSelectRow,
  };
};
