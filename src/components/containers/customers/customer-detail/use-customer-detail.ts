import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { useCustomerProfile } from '@/shared/api/querys/customers/find-one-customer-query';

export const useCustomerDetail = (customerId: string) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');

  // Datos Reales desde API
  const { data: customer, isLoading } = useCustomerProfile(customerId);

  // Iniciales para el Avatar
  const initials = useMemo(() => {
    if (!customer) return '??';
    return `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`.toUpperCase();
  }, [customer]);

  // Mock de datos que aún no vienen en API
  const metrics = {
    totalLbs: 154.5, // Mock
    totalSpent: 450000, // Mock
    packageCount: 12, // Mock
    firstOrderDate: '15 Oct 2025', // Mock
    customerType: 'VIP', // Mock
  };

  // Datos para el gráfico (Mock por ahora)
  const seasonalityData = [
    { month: 'Sep', lbs: 12 },
    { month: 'Oct', lbs: 18 },
    { month: 'Nov', lbs: 45 },
    { month: 'Dic', lbs: 38 },
    { month: 'Ene', lbs: 15 },
    { month: 'Feb', lbs: 26 },
  ];

  // Simulación de historial (Filtrado)
  const purchaseHistory = [
    {
      id: 1,
      date: '2026-02-15',
      tracking: '00000885166052',
      weight: 3.5,
      total: 16350,
      status: 'Pagado',
    },
  ];

  const filteredHistory = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    return purchaseHistory.filter((item) => item.tracking.toLowerCase().includes(query));
  }, [searchTerm]);

  return {
    customer,
    isLoading,
    initials,
    metrics,
    seasonalityData,
    filteredHistory,
    searchTerm,
    setSearchTerm,
    handleBack: () => router.back(),
    activeTab,
    setActiveTab,
  };
};
