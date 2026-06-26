import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchPackageByTracking } from '@/shared/api/querys/logistics/find-one-package-query';
import { PackageDetail } from '@/types/logistics/logistics.types';

export const usePackages = () => {
  const [input, setInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const { data, isFetching, isError, error } = useQuery<PackageDetail>({
    queryKey: ['packageLookup', searchTerm],
    queryFn: () => fetchPackageByTracking(searchTerm),
    enabled: !!searchTerm,
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = input.trim();
    if (!clean) return;
    setSearchTerm(clean);
  };

  const isPagado = data?.is_paid === true;
  const sinFactura = data?.is_paid == null;

  return {
    input,
    setInput,
    data,
    isFetching,
    isError,
    error,
    searchTerm,
    isPagado,
    sinFactura,
    handleSearch,
  };
};
