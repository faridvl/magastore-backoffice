import { useState, useMemo } from 'react';
import { useNavigation } from '@/hooks/use-navigation';
// Importamos tus interfaces
import { Customer } from '@/types/customer/customer.types';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';

export const useCustomers = () => {
  const navigation = useNavigation();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  const { data: queryResponse, isLoading, isError } = useCustomersQuery();

  const rawCustomers: Customer[] = queryResponse?.data || [];

  // 2. Transformación y Filtrado con Tipado Estricto
  const filteredCustomers = useMemo(() => {
    const cleanQuery = searchTerm.toLowerCase().trim();

    return rawCustomers
      .map((customer: Customer) => ({
        ...customer,
        full_name: `${customer.first_name} ${customer.last_name}`,
        status_label: customer.is_active ? 'Activo' : 'Inactivo',
      }))
      .filter((customer) => {
        if (!cleanQuery) return true;

        return (
          customer.full_name.toLowerCase().includes(cleanQuery) ||
          customer.id_card.includes(cleanQuery) ||
          customer.customer_code?.toLowerCase().includes(cleanQuery)
        );
      });
  }, [searchTerm, rawCustomers]);

  // 3. Paginación
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredCustomers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredCustomers, currentPage]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  const totalRows = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / itemsPerPage));

  return {
    search: searchTerm,
    setSearch: handleSearch,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    customers: paginatedCustomers,
    totalRows,
    totalPages,
    isLoading,
    isError,
    navigation,
  };
};
