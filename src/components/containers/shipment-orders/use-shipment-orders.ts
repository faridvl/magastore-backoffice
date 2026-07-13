import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useShipmentOrdersQuery } from '@/shared/api/querys/shipment-orders/use-shipment-orders-query';
import { useDeleteShipmentOrderMutation } from '@/shared/api/mutations/shipment-orders/use-delete-shipment-order-mutation';
import { ConsolidationListItem } from '@/types/logistics/logistics.types';

export enum ShipmentOrderPaymentFilter {
  ALL = 'ALL',
  SIN_NOTIFICAR = 'SIN_NOTIFICAR',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  PAGADO = 'PAGADO',
  ENTREGADO = 'ENTREGADO',
}

const PAGE_SIZE = 10;

export const useShipmentOrders = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<ShipmentOrderPaymentFilter>(ShipmentOrderPaymentFilter.PENDIENTE_PAGO);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Delete confirmation
  const [deleteUuid, setDeleteUuid] = useState<string | null>(null);

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
    paymentFilter,
    dateFrom || undefined,
    dateTo || undefined,
  );
  const { data: listData, isLoading: isLoadingList } = listQuery.useQuery();

  const { deleteShipmentOrder, isPending: isDeleting } = useDeleteShipmentOrderMutation();

  const handleConfirmDelete = async () => {
    if (!deleteUuid) return;
    try {
      await deleteShipmentOrder({ uuid: deleteUuid });
      setDeleteUuid(null);
      toast.success('Orden de envío eliminada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo eliminar la orden de envío.');
    }
  };

  const handlePaymentFilterChange = (val: ShipmentOrderPaymentFilter) => {
    setPaymentFilter(val);
    setPage(1);
  };

  const handleSelectRow = (item: ConsolidationListItem) => {
    router.push(`/admin/shipment-orders/${item.uuid}`);
  };

  return {
    // List
    page, setPage,
    search, setSearch,
    paymentFilter, handlePaymentFilterChange,
    dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setPage(1); },
    dateTo, setDateTo: (v: string) => { setDateTo(v); setPage(1); },
    shipmentOrders: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,

    // Row click
    handleSelectRow,

    // Delete
    deleteUuid, setDeleteUuid,
    handleConfirmDelete,
    isDeleting,
  };
};
