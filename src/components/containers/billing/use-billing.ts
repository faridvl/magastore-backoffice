import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useBillingListQuery } from '@/shared/api/querys/billing/use-billing-list-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';

export type PaidFilterValue = 'all' | 'paid' | 'pending';

const PAGE_SIZE = 10;

export const useBilling = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paidFilter, setPaidFilter] = useState<PaidFilterValue>('all');
  const [selectedBillingUuid, setSelectedBillingUuid] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

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
    dateFrom || undefined,
    dateTo || undefined,
  );
  const { data: listData, isLoading: isLoadingList } = billingListQuery.useQuery();

  const detailQuery = useBillingDetailQuery(selectedBillingUuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();

  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const handlePaidFilterChange = (val: PaidFilterValue) => {
    setPaidFilter(val);
    setPage(1);
  };

  const handleMarkAsPaid = async () => {
    if (!selectedBillingUuid) return;
    try {
      await markAsPaid({ billingUuid: selectedBillingUuid });
      await detailQuery.invalidate();
      await billingListQuery.invalidate();
      setSelectedBillingUuid(null);
      toast.success('Factura marcada como pagada');
    } catch (err: any) {
      toast.error('No se pudo registrar el pago. Intenta de nuevo.');
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async (uuid: string) => {
    setIsDownloadingPdf(true);
    try {
      const response = await fetch(`/api/billing/pdf?uuid=${uuid}`);
      if (!response.ok) throw new Error('No se pudo generar el PDF');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `factura-${uuid.slice(-8).toUpperCase()}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (err: any) {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo más tarde.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return {
    page, setPage,
    search, setSearch,
    paidFilter, handlePaidFilterChange,
    dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setPage(1); },
    dateTo, setDateTo: (v: string) => { setDateTo(v); setPage(1); },
    selectedBillingUuid, setSelectedBillingUuid,
    billingList: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,
    billingDetail: detailResponse?.data ?? null,
    isLoadingDetail,
    handleMarkAsPaid,
    isMarkingPaid,
    handleDownloadPdf,
    isDownloadingPdf,
  };
};
