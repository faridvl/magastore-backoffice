import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useNavigation } from '@/hooks/use-navigation';
// Importamos tus interfaces
import { Customer } from '@/types/customer/customer.types';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';
import { useCustomerWinBack } from '@/hooks/use-customer-win-back';

// WIN_BACK = "Por invitar": inactivos sin invitación desde su último paquete.
export enum CustomerStatusFilter {
  ALL = 'ALL',
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  WIN_BACK = 'WIN_BACK',
}

export interface CustomerTypeOption {
  id: number;
  name: string;
}

// Los filtros viven en la URL para que "atrás" desde una ficha devuelva el listado como estaba.
const STATUS_QUERY_KEY = 'status';
const TYPE_QUERY_KEY = 'type';
// La búsqueda puede ser una cédula o un teléfono: no va en la URL (historial, logs) sino en la sesión.
const SEARCH_STORAGE_KEY = 'customers-list-search';
const PAGE_QUERY_KEY = 'page';
const ITEMS_PER_PAGE = 10;
const SEARCH_DEBOUNCE_MS = 400;

// Un parámetro repetido (?status=A&status=B) es manipulado: se trata como ausente.
const singleQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? undefined : value;

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

export const useCustomers = () => {
  const navigation = useNavigation();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  // Debounce de 400ms, igual que el resto de buscadores del backoffice: el
  // filtrado recorre la lista completa en memoria en cada tecla.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const hasReadSearch = useRef(false);
  const lastSearch = useRef('');

  // Los cambios se aplican sobre el último query escrito, no sobre el del render:
  // dos cambios seguidos (p. ej. "Limpiar" quita estado y tipo) deben sumarse y no pisarse.
  const latestQueryRef = useRef(router.query);
  latestQueryRef.current = router.query;

  const applyQuery = useCallback(
    (patch: QueryPatch) => {
      const nextQuery = { ...latestQueryRef.current };
      Object.entries(patch).forEach(([key, value]) => {
        if (value === null || value === undefined) delete nextQuery[key];
        else nextQuery[key] = value;
      });
      latestQueryRef.current = nextQuery;
      void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    },
    [router],
  );

  // `router.query` llega vacío en el primer render: la búsqueda guardada se recupera
  // una sola vez cuando el router está listo.
  useEffect(() => {
    if (!router.isReady || hasReadSearch.current) return;
    hasReadSearch.current = true;
    const savedSearch = readSavedSearch();
    lastSearch.current = savedSearch.trim();
    setSearchTerm(savedSearch);
    setDebouncedSearch(savedSearch);
  }, [router.isReady]);

  useEffect(() => {
    if (!hasReadSearch.current) return;
    const timer = setTimeout(() => {
      const cleanSearch = searchTerm.trim();
      setDebouncedSearch(searchTerm);
      writeSavedSearch(cleanSearch);
      if (cleanSearch === lastSearch.current) return;
      lastSearch.current = cleanSearch;
      applyQuery({ [PAGE_QUERY_KEY]: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchTerm, applyQuery]);

  const { data: queryResponse, isLoading, isError } = useCustomersQuery();
  const allCustomers = useMemo<Customer[]>(() => queryResponse?.data ?? [], [queryResponse]);

  // Tipos que hoy tienen clientes: salen de la misma lista, sin otra consulta.
  const customerTypeOptions = useMemo<CustomerTypeOption[]>(() => {
    const byId = new Map<number, string>();
    allCustomers.forEach((customer) => {
      if (customer.customer_type_id != null && customer.customer_type_name) {
        byId.set(customer.customer_type_id, customer.customer_type_name);
      }
    });
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [allCustomers]);

  // Un valor inválido o de un tipo que ya no existe cae al defecto, sin error.
  const rawStatus = singleQueryValue(router.query[STATUS_QUERY_KEY]);
  const statusFilter = (Object.values(CustomerStatusFilter) as string[]).includes(rawStatus ?? '')
    ? (rawStatus as CustomerStatusFilter)
    : CustomerStatusFilter.ALL;
  const rawType = Number(singleQueryValue(router.query[TYPE_QUERY_KEY]));
  const typeFilter = customerTypeOptions.some((option) => option.id === rawType) ? rawType : null;
  const rawPage = Number(singleQueryValue(router.query[PAGE_QUERY_KEY]));
  const requestedPage = Number.isInteger(rawPage) && rawPage > 1 ? rawPage : 1;

  const { invite: inviteToComeBack, invitingCustomerId } = useCustomerWinBack();

  // 2. Transformación y Filtrado con Tipado Estricto
  const filteredCustomers = useMemo(() => {
    const rawCustomers = allCustomers;
    const cleanQuery = debouncedSearch.toLowerCase().trim();

    return rawCustomers
      .map((customer: Customer) => ({
        ...customer,
        full_name: `${customer.first_name} ${customer.last_name}`,
        status_label: customer.is_active ? 'Activo' : 'Inactivo',
      }))
      .filter((customer) => {
        if (statusFilter === CustomerStatusFilter.ACTIVE && !customer.is_active) return false;
        if (statusFilter === CustomerStatusFilter.INACTIVE && customer.is_active) return false;
        if (statusFilter === CustomerStatusFilter.WIN_BACK && !customer.win_back_pending) return false;
        if (typeFilter !== null && customer.customer_type_id !== typeFilter) return false;
        if (!cleanQuery) return true;

        // El teléfono se compara solo por dígitos: el valor guardado trae
        // formato ("+506 8888-1234") y buscar "88881234" no coincidiría.
        const queryDigits = cleanQuery.replace(/\D/g, '');
        const phoneMatches =
          queryDigits.length > 0 && !!customer.phone?.replace(/\D/g, '').includes(queryDigits);

        // Correo y teléfono entran en la búsqueda: son los datos que el
        // operador tiene a mano cuando el cliente escribe o llama.
        return (
          customer.full_name.toLowerCase().includes(cleanQuery) ||
          customer.id_card.toLowerCase().includes(cleanQuery) ||
          customer.customer_code?.toLowerCase().includes(cleanQuery) ||
          customer.email?.toLowerCase().includes(cleanQuery) ||
          phoneMatches
        );
      });
  }, [debouncedSearch, statusFilter, typeFilter, allCustomers]);

  const totalRows = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / ITEMS_PER_PAGE));
  // Una página que ya no existe (URL manipulada o filtro más estricto) cae a la última.
  const currentPage = isLoading ? requestedPage : Math.min(requestedPage, totalPages);

  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredCustomers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredCustomers, currentPage]);

  const setCurrentPage = (page: number) => applyQuery({ [PAGE_QUERY_KEY]: page > 1 ? String(page) : null });

  const handleStatusFilter = (value: CustomerStatusFilter) =>
    applyQuery({
      [STATUS_QUERY_KEY]: value === CustomerStatusFilter.ALL ? null : value,
      [PAGE_QUERY_KEY]: null,
    });

  const handleTypeFilter = (value: number | null) =>
    applyQuery({ [TYPE_QUERY_KEY]: value === null ? null : String(value), [PAGE_QUERY_KEY]: null });

  const clearFilters = () => {
    applyQuery({
      [STATUS_QUERY_KEY]: null,
      [TYPE_QUERY_KEY]: null,
      [PAGE_QUERY_KEY]: null,
    });
    setSearchTerm('');
    setDebouncedSearch('');
    lastSearch.current = '';
    writeSavedSearch('');
  };

  const activeFilterCount =
    (statusFilter !== CustomerStatusFilter.ALL ? 1 : 0) + (typeFilter !== null ? 1 : 0);

  // Total real del catálogo, no el del filtro — es el denominador que el
  // operador necesita para saber si la búsqueda dejó algo fuera.
  const totalCustomers = allCustomers.length;

  const handleInviteToComeBack = (customer: Customer) =>
    inviteToComeBack(customer.id, customer.first_name.split(' ')[0] || customer.first_name, customer.phone);

  return {
    search: searchTerm,
    setSearch: setSearchTerm,
    statusFilter,
    setStatusFilter: handleStatusFilter,
    typeFilter,
    setTypeFilter: handleTypeFilter,
    customerTypeOptions,
    hasActiveFilters: activeFilterCount > 0 || searchTerm.trim() !== '',
    clearFilters,
    currentPage,
    setCurrentPage,
    itemsPerPage: ITEMS_PER_PAGE,
    customers: paginatedCustomers,
    totalRows,
    totalCustomers,
    totalPages,
    isLoading,
    isError,
    navigation,
    handleInviteToComeBack,
    invitingCustomerId,
  };
};
