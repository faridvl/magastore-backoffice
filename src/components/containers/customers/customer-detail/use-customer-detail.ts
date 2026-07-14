import { useState, useMemo } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useCustomerProfile } from '@/shared/api/querys/customers/find-one-customer-query';
import { useUpdateCustomerMutation } from '@/shared/api/mutations/customers/use-update-customer-mutation';
import { useCustomerPackagesQuery } from '@/shared/api/querys/customers/use-customer-packages-query';
import { useCreateShipmentOrderWithPackagesMutation } from '@/shared/api/mutations/shipment-orders/use-create-shipment-order-with-packages-mutation';
import { useNotifyPackagesAvailable } from '@/hooks/use-notify-packages-available';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { CustomerUpdateInput, CustomerAddressUpdateInput, CustomerAddress } from '@/types/customer/customer.types';
import { DeliveryMethod } from '@/types/logistics/logistics.types';

export const useCustomerDetail = (customerId: string) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [selectedPackageUuids, setSelectedPackageUuids] = useState<string[]>([]);

  // Modal: elegir dirección de entrega + método de envío al crear la orden.
  // Siempre aparece — el método nunca se puede asumir automáticamente, aunque
  // el cliente tenga una sola dirección registrada.
  const [addressModalTarget, setAddressModalTarget] = useState<{ packageUuids: string[]; addresses: CustomerAddress[] } | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [selectedDeliveryMethod, setSelectedDeliveryMethod] = useState<DeliveryMethod | null>(null);

  const { data: customer, isLoading } = useCustomerProfile(customerId);
  const { updateCustomer, isPending: isSaving } = useUpdateCustomerMutation(customerId);
  const { data: packagesRes, isLoading: loadingPackages } = useCustomerPackagesQuery(customerId);
  const { notify: notifyPackagesAvailable, isNotifying } = useNotifyPackagesAvailable();
  const { createShipmentOrderWithPackages, isPending: isCreatingOrder } = useCreateShipmentOrderWithPackagesMutation();

  const [editForm, setEditForm] = useState<CustomerUpdateInput | null>(null);

  const allPackages = packagesRes?.data ?? [];
  const activePackages = allPackages.filter((p) => p.status !== 'ENTREGADO');
  const unassignedPackages = activePackages.filter((p) => !p.consolidation_uuid);
  const assignedPackages = activePackages.filter((p) => !!p.consolidation_uuid);
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
        if (i === index) {
          if (field === 'province') return { ...a, province: value as string, canton: '', district: '' };
          if (field === 'canton') return { ...a, canton: value as string, district: '' };
          return { ...a, [field]: value };
        }
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

  const handleTogglePackage = (packageUuid: string) => {
    setSelectedPackageUuids((prev) =>
      prev.includes(packageUuid) ? prev.filter((u) => u !== packageUuid) : [...prev, packageUuid],
    );
  };

  const clearSelection = () => setSelectedPackageUuids([]);

  const createOrderAndRedirect = async (packageUuids: string[], deliveryAddressId: string, deliveryMethod: DeliveryMethod) => {
    try {
      const result = await createShipmentOrderWithPackages({ customerUuid: customerId, packageUuids, deliveryAddressId, deliveryMethod });
      toast.success('Orden de envío creada correctamente');
      setSelectedPackageUuids([]);
      const uuid = (result as any)?.data?.uuid;
      router.push(uuid ? `/admin/shipment-orders/${uuid}` : '/admin/shipment-orders');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear la orden de envío.');
    }
  };

  const handleCreateOrder = async () => {
    if (selectedPackageUuids.length === 0) return;
    try {
      const { data: addresses } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: CustomerAddress[] }>(`/customers/${customerId}/addresses`);

      setSelectedAddressId(addresses.find((a: CustomerAddress) => a.is_default)?.id ?? addresses[0]?.id ?? '');
      setSelectedDeliveryMethod(null);
      setAddressModalTarget({ packageUuids: selectedPackageUuids, addresses });
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear la orden de envío.');
    }
  };

  const handleConfirmCreateOrderWithAddress = async () => {
    if (!addressModalTarget || !selectedAddressId || !selectedDeliveryMethod) return;
    await createOrderAndRedirect(addressModalTarget.packageUuids, selectedAddressId, selectedDeliveryMethod);
    setAddressModalTarget(null);
    setSelectedAddressId('');
    setSelectedDeliveryMethod(null);
  };

  return {
    customer,
    isLoading,
    initials,
    metrics,
    seasonalityData,
    activePackages,
    unassignedPackages,
    assignedPackages,
    filteredHistory,
    loadingPackages,
    searchTerm,
    setSearchTerm,
    handleNotifyWhatsApp,
    isNotifying,
    selectedPackageUuids,
    handleTogglePackage,
    clearSelection,
    handleCreateOrder,
    isCreatingOrder,
    addressModalTarget,
    setAddressModalTarget,
    selectedAddressId,
    setSelectedAddressId,
    selectedDeliveryMethod,
    setSelectedDeliveryMethod,
    handleConfirmCreateOrderWithAddress,
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
