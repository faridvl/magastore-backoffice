import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useBillingListQuery } from '@/shared/api/querys/billing/use-billing-list-query';
import { usePendingConsolidationsQuery } from '@/shared/api/querys/billing/use-pending-consolidations-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useGenerateInvoiceMutation } from '@/shared/api/mutations/billing/use-generate-invoice-mutation';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
import { DeliveryMethod, PendingConsolidation } from '@/types/logistics/logistics.types';

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

  // Estado para el modal de generación de factura
  const [invoiceTarget, setInvoiceTarget] = useState<PendingConsolidation | null>(null);
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<DeliveryMethod>('CORREOS_CR');

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

  const handleOpenInvoiceModal = (consolidation: PendingConsolidation) => {
    setInvoiceTarget(consolidation);
    setSelectedDeliveryMethod('CORREOS_CR');
  };

  const handleConfirmInvoice = async () => {
    if (!invoiceTarget) return;
    try {
      await generateInvoice({
        consolidationUuid: invoiceTarget.uuid,
        deliveryMethod: selectedDeliveryMethod,
      });
      setInvoiceTarget(null);
      setActiveTab('registros');
      toast.success('Factura generada correctamente');
    } catch (err: any) {
      toast.error(err?.message || 'Error al generar la factura');
    }
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
      toast.error(err?.message || 'Error al marcar como pagada');
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
      toast.error(err?.message || 'No se pudo generar el PDF');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return {
    activeTab, setActiveTab,
    page, setPage,
    search, setSearch,
    paidFilter, handlePaidFilterChange,
    selectedBillingUuid, setSelectedBillingUuid,
    // Invoice modal
    invoiceTarget, setInvoiceTarget,
    selectedDeliveryMethod, setSelectedDeliveryMethod,
    handleOpenInvoiceModal,
    handleConfirmInvoice,
    // List
    billingList: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,
    // Pending
    pendingConsolidations: pendingData?.data ?? [],
    isLoadingPending,
    // Detail
    billingDetail: detailResponse?.data ?? null,
    isLoadingDetail,
    // Mutations
    isGenerating,
    handleMarkAsPaid,
    isMarkingPaid,
    handleDownloadPdf,
    isDownloadingPdf,
  };
};
