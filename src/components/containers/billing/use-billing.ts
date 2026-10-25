import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useBillingListQuery } from '@/shared/api/querys/billing/use-billing-list-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
import { downloadPdf } from '@/shared/utils/download-pdf';
import { PaymentMethod } from '@/types/logistics/logistics.types';

export enum BillingPaidFilter {
  ALL = 'ALL',
  POR_COBRAR = 'POR_COBRAR',
  PAGADA = 'PAGADA',
}

const PAGE_SIZE = 10;
const SEARCH_DEBOUNCE_MS = 400;

// Los filtros viven en la URL para que "atrás" desde una factura devuelva el listado como estaba.
const STATUS_QUERY_KEY = 'status';
const METHOD_QUERY_KEY = 'method';
const FROM_QUERY_KEY = 'from';
const TO_QUERY_KEY = 'to';
const PAGE_QUERY_KEY = 'page';
// La búsqueda puede ser el nombre de un cliente: va en la sesión, no en la URL (historial, logs).
const SEARCH_STORAGE_KEY = 'billing-list-search';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

// Un parámetro repetido (?status=A&status=B) es manipulado: se trata como ausente.
const singleQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? undefined : value;

const parseIsoDate = (value: string | undefined): string => {
  if (!value || !ISO_DATE_PATTERN.test(value)) return '';
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value ? '' : value;
};

const readSavedSearch = (): string => {
  try {
    return window.sessionStorage.getItem(SEARCH_STORAGE_KEY) ?? '';
  } catch {
    return '';
  }
};

const writeSavedSearch = (value: string) => {
  try {
    if (value) window.sessionStorage.setItem(SEARCH_STORAGE_KEY, value);
    else window.sessionStorage.removeItem(SEARCH_STORAGE_KEY);
  } catch {
    // Sin almacenamiento (modo privado): la búsqueda simplemente no se recuerda.
  }
};

type QueryPatch = Partial<Record<string, string | null>>;

export const useBilling = () => {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBillingUuid, setSelectedBillingUuid] = useState<string | null>(null);
  const [isSearchReady, setIsSearchReady] = useState(false);
  const lastSearch = useRef('');

  // Los cambios se aplican sobre el último query escrito, no sobre el del render:
  // dos cambios seguidos (p. ej. "Limpiar" quita estado y período) deben sumarse y no pisarse.
  const latestQueryRef = useRef(router.query);
  latestQueryRef.current = router.query;

  const applyQuery = useCallback(
    (patch: QueryPatch) => {
      const nextQuery = { ...latestQueryRef.current };
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined) delete nextQuery[key];
        else nextQuery[key] = value;
      });
      // Sin cambios no se navega: cada navegación cambia `router.query` y relanzaría los efectos.
      const isUnchanged =
        JSON.stringify(Object.entries(nextQuery).sort()) ===
        JSON.stringify(Object.entries(latestQueryRef.current).sort());
      if (isUnchanged) return;
      latestQueryRef.current = nextQuery;
      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router],
  );

  // `router.query` llega vacío en el primer render: la búsqueda guardada se recupera una sola vez.
  useEffect(() => {
    if (!router.isReady || isSearchReady) return;
    const savedSearch = readSavedSearch();
    lastSearch.current = savedSearch.trim();
    setSearch(savedSearch);
    setDebouncedSearch(savedSearch);
    setIsSearchReady(true);
  }, [router.isReady, isSearchReady]);

  useEffect(() => {
    if (!isSearchReady) return;
    const timer = setTimeout(() => {
      const cleanSearch = search.trim();
      setDebouncedSearch(search);
      writeSavedSearch(cleanSearch);
      if (cleanSearch === lastSearch.current) return;
      lastSearch.current = cleanSearch;
      applyQuery({ [PAGE_QUERY_KEY]: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, applyQuery, isSearchReady]);

  // Un valor inválido cae al defecto, sin error.
  const rawStatus = singleQueryValue(router.query[STATUS_QUERY_KEY]);
  const paidFilter = (Object.values(BillingPaidFilter) as string[]).includes(rawStatus ?? '')
    ? (rawStatus as BillingPaidFilter)
    : BillingPaidFilter.ALL;
  const rawMethod = singleQueryValue(router.query[METHOD_QUERY_KEY]);
  // Una factura por cobrar no tiene método de pago: con ese estado el método se ignora.
  const paymentMethod =
    paidFilter !== BillingPaidFilter.POR_COBRAR && (Object.values(PaymentMethod) as string[]).includes(rawMethod ?? '')
      ? (rawMethod as PaymentMethod)
      : null;
  const dateFrom = parseIsoDate(singleQueryValue(router.query[FROM_QUERY_KEY]));
  const dateTo = parseIsoDate(singleQueryValue(router.query[TO_QUERY_KEY]));
  const rawPage = Number(singleQueryValue(router.query[PAGE_QUERY_KEY]));
  const page = Number.isInteger(rawPage) && rawPage > 1 ? rawPage : 1;

  const isPaid = paidFilter === BillingPaidFilter.ALL ? undefined : paidFilter === BillingPaidFilter.PAGADA;

  const billingListQuery = useBillingListQuery(
    page,
    PAGE_SIZE,
    debouncedSearch.trim() || undefined,
    isPaid,
    dateFrom || undefined,
    dateTo || undefined,
    paymentMethod ?? undefined,
  );
  const {
    data: listData, isLoading: isLoadingList, isError: isListError, refetch: refetchList,
  } = billingListQuery.useQuery({ enabled: router.isReady && isSearchReady });

  const listMeta = listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 };

  // Una página que ya no existe (URL manipulada o filtro más estricto) cae a la última.
  useEffect(() => {
    if (!listData || page <= listMeta.totalPages) return;
    applyQuery({ [PAGE_QUERY_KEY]: listMeta.totalPages > 1 ? String(listMeta.totalPages) : null });
  }, [listData, page, listMeta.totalPages, applyQuery]);

  const detailQuery = useBillingDetailQuery(selectedBillingUuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail, isFetching: isFetchingDetail } = detailQuery.useQuery();

  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const setPage = (next: number) => applyQuery({ [PAGE_QUERY_KEY]: next > 1 ? String(next) : null });

  const handlePaidFilterChange = (value: BillingPaidFilter) =>
    applyQuery({
      [STATUS_QUERY_KEY]: value === BillingPaidFilter.ALL ? null : value,
      ...(value === BillingPaidFilter.POR_COBRAR ? { [METHOD_QUERY_KEY]: null } : {}),
      [PAGE_QUERY_KEY]: null,
    });

  const handlePaymentMethodChange = (value: PaymentMethod | null) =>
    applyQuery({ [METHOD_QUERY_KEY]: value, [PAGE_QUERY_KEY]: null });

  // El selector de período llama a los dos extremos seguidos: se suman en un solo query.
  const setDateFrom = (value: string) => applyQuery({ [FROM_QUERY_KEY]: value || null, [PAGE_QUERY_KEY]: null });
  const setDateTo = (value: string) => applyQuery({ [TO_QUERY_KEY]: value || null, [PAGE_QUERY_KEY]: null });
  const clearDates = () => applyQuery({ [FROM_QUERY_KEY]: null, [TO_QUERY_KEY]: null, [PAGE_QUERY_KEY]: null });

  const clearFilters = () => {
    applyQuery({
      [STATUS_QUERY_KEY]: null,
      [METHOD_QUERY_KEY]: null,
      [FROM_QUERY_KEY]: null,
      [TO_QUERY_KEY]: null,
      [PAGE_QUERY_KEY]: null,
    });
    setSearch('');
    setDebouncedSearch('');
    lastSearch.current = '';
    writeSavedSearch('');
  };

  // Al vaciar el buscador se olvida de inmediato, sin esperar el debounce.
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (!value.trim()) writeSavedSearch('');
  };

  const hasActiveFilters =
    paidFilter !== BillingPaidFilter.ALL || !!paymentMethod || !!dateFrom || !!dateTo || !!debouncedSearch.trim();

  const handleMarkAsPaid = async (method: PaymentMethod) => {
    if (!selectedBillingUuid) return;
    try {
      await markAsPaid({ billingUuid: selectedBillingUuid, paymentMethod: method });
      await detailQuery.invalidate();
      await billingListQuery.invalidate();
      setSelectedBillingUuid(null);
      toast.success('Factura marcada como pagada');
    } catch {
      toast.error('No se pudo registrar el pago. Intenta de nuevo.');
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async (uuid: string, invoiceNumber?: number) => {
    setIsDownloadingPdf(true);
    try {
      const label = invoiceNumber != null ? `F-${String(invoiceNumber).padStart(4, '0')}` : uuid.slice(-8).toUpperCase();
      await downloadPdf(`/api/billing/pdf?uuid=${uuid}`, `FACTURA-${label}.pdf`);
    } catch {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo más tarde.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  return {
    page, setPage,
    search, setSearch: handleSearchChange,
    paidFilter, handlePaidFilterChange,
    paymentMethod, handlePaymentMethodChange,
    dateFrom, setDateFrom,
    dateTo, setDateTo,
    clearDates,
    clearFilters,
    hasActiveFilters,
    selectedBillingUuid, setSelectedBillingUuid,
    billingList: listData?.data ?? [],
    listMeta,
    listSummary: listData?.summary ?? null,
    isLoadingList,
    isListError,
    refetchList,
    billingDetail: detailResponse?.data ?? null,
    isLoadingDetail,
    isFetchingDetail,
    retryDetail: detailQuery.invalidate,
    handleMarkAsPaid,
    isMarkingPaid,
    handleDownloadPdf,
    isDownloadingPdf,
  };
};
