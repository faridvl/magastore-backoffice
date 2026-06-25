import { useState, useEffect } from 'react';
import { useBillingListQuery } from '@/shared/api/querys/billing/use-billing-list-query';
import { usePendingConsolidationsQuery } from '@/shared/api/querys/billing/use-pending-consolidations-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useGenerateInvoiceMutation } from '@/shared/api/mutations/billing/use-generate-invoice-mutation';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';

export type PaidFilterValue = 'all' | 'paid' | 'pending';
export type ActiveBillingTab = 'registros' | 'por-facturar';

const PAGE_SIZE = 10;

export const useBilling = () => {
  const [activeTab, setActiveTab] = useState<ActiveBillingTab>('registros');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paidFilter, setPaidFilter] = useState<PaidFilterValue>('all');
  const [selectedBillingUuid, setSelectedBillingUuid] = useState<string | null>(null);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const isPaid = paidFilter === 'all' ? undefined : paidFilter === 'paid' ? true : false;

  const billingListQuery = useBillingListQuery(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
    isPaid,
  );
  const { data: listData, isLoading: isLoadingList } = billingListQuery.useQuery();

  const pendingQuery = usePendingConsolidationsQuery();
  const { data: pendingData, isLoading: isLoadingPending } = pendingQuery.useQuery();

  const detailQuery = useBillingDetailQuery(selectedBillingUuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();

  const { generateInvoice, isPending: isGenerating } = useGenerateInvoiceMutation();
  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const handlePaidFilterChange = (val: PaidFilterValue) => {
    setPaidFilter(val);
    setPage(1);
  };

  const handleGenerateInvoice = async (consolidationUuid: string) => {
    await generateInvoice({ consolidationUuid });
    setActiveTab('registros');
  };

  const handleMarkAsPaid = async () => {
    if (!selectedBillingUuid) return;
    await markAsPaid({ billingUuid: selectedBillingUuid });
    await detailQuery.invalidate();
    await billingListQuery.invalidate();
    setSelectedBillingUuid(null);
  };

  return {
    activeTab,
    setActiveTab,
    page,
    setPage,
    search,
    setSearch,
    paidFilter,
    handlePaidFilterChange,
    selectedBillingUuid,
    setSelectedBillingUuid,
    billingList: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,
    pendingConsolidations: pendingData?.data ?? [],
    isLoadingPending,
    billingDetail: detailResponse?.data ?? null,
    isLoadingDetail,
    handleGenerateInvoice,
    isGenerating,
    handleMarkAsPaid,
    isMarkingPaid,
  };
};
