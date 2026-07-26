import { useState, useMemo, useEffect } from 'react';
import { useNavigation } from '@/hooks/use-navigation';
// Importamos tus interfaces
import { Customer } from '@/types/customer/customer.types';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';

export const useCustomers = () => {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  // Debounce de 400ms, igual que el resto de buscadores del backoffice: el
  // filtrado recorre la lista completa en memoria en cada tecla.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const itemsPerPage = 10;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data: queryResponse, isLoading, isError } = useCustomersQuery();

  // 2. Transformación y Filtrado con Tipado Estricto
  const filteredCustomers = useMemo(() => {
    const rawCustomers: Customer[] = queryResponse?.data ?? [];
    const cleanQuery = debouncedSearch.toLowerCase().trim();

    return rawCustomers
      .map((customer: Customer) => ({
        ...customer,
        full_name: `${customer.first_name} ${customer.last_name}`,
        status_label: customer.is_active ? 'Activo' : 'Inactivo',
      }))
      .filter((customer) => {
        if (statusFilter === 'active' && !customer.is_active) return false;
        if (statusFilter === 'inactive' && customer.is_active) return false;
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
  }, [debouncedSearch, statusFilter, queryResponse]);

  // 3. Paginación
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const handleStatusFilter = (value: 'all' | 'active' | 'inactive') => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const totalRows = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));

  // Total real del catálogo, no el del filtro — es el denominador que el
  // operador necesita para saber si la búsqueda dejó algo fuera.
  const totalCustomers = queryResponse?.data?.length ?? 0;

  return {
    search: searchTerm,
    setSearch: handleSearch,
    statusFilter,
    setStatusFilter: handleStatusFilter,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    customers: paginatedCustomers,
    totalRows,
    totalCustomers,
    totalPages,
    isLoading,
    isError,
    navigation,
  };
};
