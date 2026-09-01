import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useCourierRatesQuery } from '@/shared/api/querys/logistics/use-courier-rates-query';
import { useCustomerProfile } from '@/shared/api/querys/customers/find-one-customer-query';
import { useUpdateCustomerMutation } from '@/shared/api/mutations/customers/use-update-customer-mutation';
import { useCustomerPackagesQuery } from '@/shared/api/querys/customers/use-customer-packages-query';
import { useCustomerTypesQuery } from '@/shared/api/querys/customers/use-customer-types-query';
import { useCreateShipmentOrderWithPackagesMutation } from '@/shared/api/mutations/shipment-orders/use-create-shipment-order-with-packages-mutation';
import { useNotifyPackagesAvailable } from '@/hooks/use-notify-packages-available';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { CustomerUpdateInput, CustomerAddressUpdateInput, CustomerAddress } from '@/types/customer/customer.types';
import { DeliveryMethod } from '@/types/logistics/logistics.types';

export const useCustomerDetail = (customerId: string) => {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  // Debounce de 400ms, igual que el resto de buscadores del backoffice.
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 400);
    return () => clearTimeout(timer);
  }, [searchTerm]);
  const [activeTab, setActiveTab] = useState<'info' | 'history'>('info');
  const [isEditMode, setIsEditMode] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const { data: customerTypesRes } = useCustomerTypesQuery();
  const customerTypes = (customerTypesRes?.data ?? []).filter((t) => t.is_active);
  const [selectedPackageUuids, setSelectedPackageUuids] = useState<string[]>([]);

  const queryClient = useQueryClient();
  const { data: courierRatesRes } = useCourierRatesQuery();
  const courierRates = useMemo(
    () => (Array.isArray(courierRatesRes) ? courierRatesRes : []),
    [courierRatesRes],
  );
  const [isAssignCodeModalOpen, setIsAssignCodeModalOpen] = useState(false);
  const [isAssigningCode, setIsAssigningCode] = useState(false);
  // Ruta cuyo casillero se está eliminando — deshabilita solo esa tarjeta.
  const [removingRouteId, setRemovingRouteId] = useState<number | null>(null);

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
  // Historial = registro completo del cliente, sin filtrar por estado. Antes
  // exigía status === 'ENTREGADO' y quedaba vacío: en el flujo v2 la orden se
  // marca entregada pero el status del paquete no siempre la sigue, así que
  // esos paquetes no aparecían en ninguna de las tres listas.
  const historyPackages = allPackages;

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
      customer_type_id: customer.customer_type_id,
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

  const handleEditField = (field: keyof Omit<CustomerUpdateInput, 'addresses'>, value: string | boolean | number | null) => {
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
    } catch (err: any) {
      // El backend explica la causa exacta (correo duplicado, dirección
      // inválida…). El genérico anterior la descartaba y dejaba al operador
      // reintentando sin saber qué corregir.
      const message = err?.message ?? 'No se pudieron guardar los cambios del cliente.';
      setEditError(message);
      toast.error(message);
    }
  };

  const initials = useMemo(() => {
    if (!customer) return '??';
    return `${customer.first_name.charAt(0)}${customer.last_name.charAt(0)}`.toUpperCase();
  }, [customer]);

  // Métricas reales desde el endpoint de paquetes (conteo, peso, facturado,
  // fechas de actividad) — antes esto era un null hardcodeado y las cards
  // del detalle mostraban "—" permanentemente.
  const rawMetrics = packagesRes?.metrics ?? null;
  const metrics = useMemo(() => {
    if (!rawMetrics) return null;
    const fmtDate = (d: string | null) =>
      d ? new Date(d).toLocaleDateString('es-CR', { timeZone: 'America/Costa_Rica' }) : '—';
    return {
      packageCount: Number(rawMetrics.package_count),
      totalLbs: Number(rawMetrics.total_weight_lb),
      totalSpent: Number(rawMetrics.total_billed_crc),
      firstPackageDate: fmtDate(rawMetrics.first_package_date),
      lastPackageDate: fmtDate(rawMetrics.last_package_date),
    };
  }, [rawMetrics]);

  const filteredHistory = useMemo(() => {
    const query = debouncedSearch.toLowerCase().trim();
    if (!query) return historyPackages;
    // También por courier: en el historial completo el tracking ya no es el
    // único criterio útil para encontrar un paquete viejo.
    return historyPackages.filter(
      (p) =>
        p.tracking_number.toLowerCase().includes(query) ||
        (p.courier_rate_name ?? '').toLowerCase().includes(query),
    );
  }, [historyPackages, debouncedSearch]);

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

  /**
   * Couriers que el cliente todavía no tiene. La ficha ya lista los asignados;
   * esto es lo que falta para poder darle uno nuevo sin pasar por el flujo de
   * registro de paquetes.
   */
  const availableCourierRates = useMemo(() => {
    if (!customer) return [];
    // Se compara por código ya emitido, no por origin|package_type: dos
    // couriers del mismo origen y tipo comparten ruta, así que filtrar por la
    // clave natural hacía desaparecer al segundo courier de la lista apenas se
    // asignaba el primero — el operador se quedaba sin poder agregarlo.
    const ownedRoutes = new Set(customer.warehouse_codes.map((wc) => wc.warehouse_route_id));
    return courierRates.filter(
      (r) => !!r.warehouse_route_id && !ownedRoutes.has(r.warehouse_route_id),
    );
  }, [customer, courierRates]);

  /**
   * Couriers activos que no se pueden ofrecer porque no tienen casillero
   * configurado. Se listan para explicar por qué el selector puede aparecer
   * vacío en vez de dejar al operador sin pistas.
   */
  const couriersWithoutWarehouse = useMemo(
    () => courierRates.filter((r) => !r.warehouse_route_id).map((r) => r.name),
    [courierRates],
  );

  const assignWarehouseCode = async (courierRateUuid: string) => {
    setIsAssigningCode(true);
    try {
      const res: any = await ApiServiceClient(env.API.BASE_URL).post('/customers/assign-warehouse-code', {
        customerId,
        courierRateUuid,
      });
      // La ficha del cliente es quien pinta la lista de casilleros: sin
      // invalidarla el código recién creado no aparecería hasta recargar.
      await queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      await queryClient.invalidateQueries({ queryKey: ['customer-warehouse-codes', customerId] });
      // El catálogo de couriers tiene staleTime de 10 min: sin invalidarlo, un
      // courier dado de alta hace poco no aparecería en el selector hasta que
      // la caché expirara sola.
      await queryClient.invalidateQueries({ queryKey: ['courier-rates'] });
      toast.success(`Casillero asignado: ${res?.data?.code ?? ''}`);
      setIsAssignCodeModalOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo asignar el casillero.');
    } finally {
      setIsAssigningCode(false);
    }
  };

  /**
   * Quita un casillero. El backend bloquea el último y los que ya tienen
   * paquetes registrados: el motivo llega en el mensaje de error y se muestra
   * tal cual, porque es accionable para el operador.
   */
  const removeWarehouseCode = async (warehouseRouteId: number) => {
    setRemovingRouteId(warehouseRouteId);
    try {
      await ApiServiceClient(env.API.BASE_URL).delete(
        `/customers/${customerId}/warehouse-codes?warehouseRouteId=${warehouseRouteId}`,
      );
      await queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      await queryClient.invalidateQueries({ queryKey: ['customer-warehouse-codes', customerId] });
      // El customer_code puede haber cambiado al quitar el principal, y el
      // listado lo muestra.
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      toast.success('Casillero eliminado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo eliminar el casillero.');
    } finally {
      setRemovingRouteId(null);
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
    availableCourierRates,
    couriersWithoutWarehouse,
    isAssignCodeModalOpen,
    openAssignCodeModal: () => setIsAssignCodeModalOpen(true),
    closeAssignCodeModal: () => setIsAssignCodeModalOpen(false),
    assignWarehouseCode,
    isAssigningCode,
    removeWarehouseCode,
    removingRouteId,
    handleBack: () => router.back(),
    activeTab,
    setActiveTab,
    isEditMode,
    editForm,
    customerTypes,
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
