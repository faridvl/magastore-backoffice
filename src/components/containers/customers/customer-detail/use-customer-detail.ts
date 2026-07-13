import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useCustomerProfile } from '@/shared/api/querys/customers/find-one-customer-query';
import { useUpdateCustomerMutation } from '@/shared/api/mutations/customers/use-update-customer-mutation';
import { useCustomerPackagesQuery } from '@/shared/api/querys/customers/use-customer-packages-query';
import { useNotifyPackagesAvailable } from '@/hooks/use-notify-packages-available';
import { CustomerUpdateInput, CustomerAddressUpdateInput } from '@/types/customer/customer.types';

export const useCustomerDetail = (customerId: string) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const { data: customer, isLoading } = useCustomerProfile(customerId);
  const { updateCustomer, isPending: isSaving } = useUpdateCustomerMutation(customerId);
  const { data: packagesRes, isLoading: loadingPackages } = useCustomerPackagesQuery(customerId);
  const { notify: notifyPackagesAvailable, isNotifying } = useNotifyPackagesAvailable();

  const [editForm, setEditForm] = useState<CustomerUpdateInput | null>(null);

  const allPackages = packagesRes?.data ?? [];
  const activePackages = allPackages.filter((p) => p.status !== 'ENTREGADO');
  const historyPackages = allPackages.filter((p) => p.status === 'ENTREGADO');

  const enterEditMode = () => {
    if (!customer) return;
    setEditForm({
      id_card: customer.id_card,
      id_type: customer.id_type,
      first_name: customer.first_name,
      last_name: customer.last_name,
      email: customer.email,
      phone: customer.phone,
      is_active: customer.is_active,
      addresses: customer.addresses.map((a) => ({
        id: a.id,
        province: a.province,
        canton: a.canton,
        district: a.district,
        exact_address: a.exact_address,
        address_label: a.address_label ?? 'Casa',
        is_default: a.is_default,
      })),
    });
    setEditError(null);
    setIsEditMode(true);
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setEditForm(null);
    setEditError(null);
  };

  const handleEditField = (field: keyof Omit<CustomerUpdateInput, 'addresses'>, value: string | boolean) => {
    setEditForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const handleEditAddress = (index: number, field: keyof CustomerAddressUpdateInput, value: string | boolean) => {
    setEditForm((prev) => {
      if (!prev || !prev.addresses) return prev;
      const updated = prev.addresses.map((a, i) => {
        if (i === index) return { ...a, [field]: value };
        if (field === 'is_default' && value === true) return { ...a, is_default: false };
        return a;
      });
      return { ...prev, addresses: updated };
    });
  };

  const addNewAddress = () => {
    setEditForm((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        addresses: [
          ...(prev.addresses ?? []),
          { province: '', canton: '', district: '', exact_address: '', address_label: 'Casa', is_default: false },
        ],
      };
    });
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setEditError(null);
    try {
      await updateCustomer(editForm);
      setIsEditMode(false);
      setEditForm(null);
      toast.success('Cliente actualizado correctamente');
    } catch {
      setEditError('No se pudieron guardar los cambios.');
      toast.error('No se pudieron guardar los cambios del cliente. Intenta de nuevo.');
    }
  };

  const initials = useMemo(() => {
    if (!customer) return '??';
    return `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`.toUpperCase();
  }, [customer]);

  const metrics = null as { totalLbs: number; totalSpent: number; packageCount: number; firstOrderDate: string; customerType: string } | null;

  const seasonalityData: { month: string; lbs: number }[] = [];

  const filteredHistory = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    if (!query) return historyPackages;
    return historyPackages.filter((p) => p.tracking_number.toLowerCase().includes(query));
  }, [historyPackages, searchTerm]);

  const handleNotifyWhatsApp = async () => {
    if (!customer) return;
    await notifyPackagesAvailable(customer.id, customer.first_name, customer.phone);
  };

  return {
    customer,
    isLoading,
    initials,
    metrics,
    seasonalityData,
    activePackages,
    filteredHistory,
    loadingPackages,
    searchTerm,
    setSearchTerm,
    handleNotifyWhatsApp,
    isNotifying,
    handleBack: () => router.back(),
    activeTab,
    setActiveTab,
    isEditMode,
    editForm,
    editError,
    isSaving,
    enterEditMode,
    cancelEdit,
    handleEditField,
    handleEditAddress,
    addNewAddress,
    saveEdit,
  };
};
