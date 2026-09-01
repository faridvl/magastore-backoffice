import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useShipmentOrdersQuery } from '@/shared/api/querys/shipment-orders/use-shipment-orders-query';
import { useDeleteShipmentOrderMutation } from '@/shared/api/mutations/shipment-orders/use-delete-shipment-order-mutation';
import { useCreateShipmentOrderWithPackagesMutation } from '@/shared/api/mutations/shipment-orders/use-create-shipment-order-with-packages-mutation';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import {
  ConsolidationListItem,
  CustomerWithAvailablePackages,
  AvailablePackage,
  DeliveryMethod,
} from '@/types/logistics/logistics.types';
import { CustomerAddress } from '@/types/customer/customer.types';

export type CreateOrderStep = 'customer' | 'packages' | 'address';

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
  // El panel Operativo enlaza acá con el filtro ya elegido (?payment=...). Sin
  // el parámetro se mantiene el default de siempre: pendientes de pago.
  const [paymentFilter, setPaymentFilter] = useState<ShipmentOrderPaymentFilter>(() => {
    const fromQuery = router.query.payment;
    const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
    return value && value in ShipmentOrderPaymentFilter
      ? ShipmentOrderPaymentFilter[value as keyof typeof ShipmentOrderPaymentFilter]
      : ShipmentOrderPaymentFilter.PENDIENTE_PAGO;
  });
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Delete confirmation
  const [deleteUuid, setDeleteUuid] = useState<string | null>(null);

  // Crear orden desde esta pantalla — mismo flujo que Logística/ficha de cliente
  // (paquetes del mismo cliente, dirección + método obligatorios, redirige al
  // detalle) pero empezando por elegir el cliente, ya que aquí no hay tabla de
  // paquetes de la cual partir.
  const [createStep, setCreateStep] = useState<CreateOrderStep | null>(null);
  const [createCustomers, setCreateCustomers] = useState<CustomerWithAvailablePackages[]>([]);
  const [createCustomer, setCreateCustomer] = useState<CustomerWithAvailablePackages | null>(null);
  const [createPackages, setCreatePackages] = useState<AvailablePackage[]>([]);
  const [createSelectedPackageUuids, setCreateSelectedPackageUuids] = useState<string[]>([]);
  const [createAddresses, setCreateAddresses] = useState<CustomerAddress[]>([]);
  const [createAddressId, setCreateAddressId] = useState('');
  const [createDeliveryMethod, setCreateDeliveryMethod] = useState<DeliveryMethod | null>(null);
  const [isLoadingCreateData, setIsLoadingCreateData] = useState(false);
  const [showCreateAddressesModal, setShowCreateAddressesModal] = useState(false);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  // `router.query` llega vacío en el primer render, así que el filtro del enlace
  // se aplica cuando el router está listo. Solo actúa si el parámetro existe:
  // navegar sin él no pisa lo que el operador haya elegido a mano.
  useEffect(() => {
    if (!router.isReady) return;
    const fromQuery = router.query.payment;
    const value = Array.isArray(fromQuery) ? fromQuery[0] : fromQuery;
    if (value && value in ShipmentOrderPaymentFilter) {
      setPaymentFilter(
        ShipmentOrderPaymentFilter[value as keyof typeof ShipmentOrderPaymentFilter],
      );
      setPage(1);
    }
  }, [router.isReady, router.query.payment]);

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
  const { createShipmentOrderWithPackages, isPending: isCreatingOrder } = useCreateShipmentOrderWithPackagesMutation();

  const openCreateModal = async () => {
    setCreateStep('customer');
    setCreateCustomer(null);
    setCreatePackages([]);
    setCreateSelectedPackageUuids([]);
    setCreateAddresses([]);
    setCreateAddressId('');
    setCreateDeliveryMethod(null);
    setIsLoadingCreateData(true);
    try {
      const { data } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: CustomerWithAvailablePackages[] }>('/consolidations?customersWithAvailablePackages=1');
      setCreateCustomers(data);
    } catch {
      toast.error('No se pudo cargar la lista de clientes con paquetes disponibles.');
    } finally {
      setIsLoadingCreateData(false);
    }
  };

  const closeCreateModal = () => setCreateStep(null);

  const handleSelectCreateCustomer = async (customer: CustomerWithAvailablePackages) => {
    setCreateCustomer(customer);
    setIsLoadingCreateData(true);
    try {
      const { data } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: AvailablePackage[] }>(`/consolidations?availablePackages=${customer.customer_id}`);
      setCreatePackages(data);
      setCreateSelectedPackageUuids([]);
      setCreateStep('packages');
    } catch {
      toast.error('No se pudieron cargar los paquetes disponibles del cliente.');
    } finally {
      setIsLoadingCreateData(false);
    }
  };

  const toggleCreatePackage = (packageUuid: string) => {
    setCreateSelectedPackageUuids((prev) =>
      prev.includes(packageUuid) ? prev.filter((u) => u !== packageUuid) : [...prev, packageUuid],
    );
  };

  /**
   * Marca o desmarca de una vez todos los paquetes disponibles del cliente. El
   * caso normal es enviarlos todos, así que ir uno por uno es el camino largo
   * para lo más frecuente.
   */
  const toggleAllCreatePackages = () => {
    setCreateSelectedPackageUuids((prev) =>
      createPackages.length > 0 && prev.length === createPackages.length
        ? []
        : createPackages.map((p) => p.uuid),
    );
  };

  const handleGoToAddressStep = async () => {
    if (!createCustomer || createSelectedPackageUuids.length === 0) return;
    setIsLoadingCreateData(true);
    try {
      const { data } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: CustomerAddress[] }>(`/customers/${createCustomer.customer_id}/addresses`);
      setCreateAddresses(data);
      setCreateAddressId(data.find((a: CustomerAddress) => a.is_default)?.id ?? data[0]?.id ?? '');
      setCreateDeliveryMethod(null);
      setCreateStep('address');
    } catch {
      toast.error('No se pudieron cargar las direcciones del cliente.');
    } finally {
      setIsLoadingCreateData(false);
    }
  };

  /**
   * Refresca la lista del asistente tras crear, editar o borrar una dirección.
   *
   * El endpoint ya devuelve la lista completa, así que no hace falta releerla.
   * Se copia a estado local porque este paso no lee las direcciones por React
   * Query: invalidar la caché que usa el modal no refrescaría nada acá.
   */
  const handleCreateAddressesSaved = (addresses: CustomerAddress[]) => {
    setCreateAddresses(addresses);
    setCreateAddressId((prev) => {
      // La seleccionada sigue existiendo: se respeta, aunque el operador acabe
      // de editar otra.
      if (prev && addresses.some((a) => a.id === prev)) return prev;
      return addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? '';
    });
  };

  const handleConfirmCreate = async () => {
    if (!createCustomer || createSelectedPackageUuids.length === 0 || !createAddressId || !createDeliveryMethod) return;
    try {
      const result = await createShipmentOrderWithPackages({
        customerUuid: createCustomer.customer_id,
        packageUuids: createSelectedPackageUuids,
        deliveryAddressId: createAddressId,
        deliveryMethod: createDeliveryMethod,
      });
      toast.success('Orden de envío creada correctamente');
      setCreateStep(null);
      const uuid = (result as any)?.data?.uuid;
      router.push(uuid ? `/admin/shipment-orders/${uuid}` : '/admin/shipment-orders');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear la orden de envío.');
    }
  };

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

    // Crear orden (modal en 3 pasos: cliente → paquetes → dirección/método)
    createStep,
    openCreateModal,
    closeCreateModal,
    createCustomers,
    createCustomer,
    handleSelectCreateCustomer,
    createPackages,
    createSelectedPackageUuids,
    toggleCreatePackage,
    toggleAllCreatePackages,
    handleGoToAddressStep,
    createAddresses,
    createAddressId, setCreateAddressId,
    showCreateAddressesModal, setShowCreateAddressesModal,
    handleCreateAddressesSaved,
    createDeliveryMethod, setCreateDeliveryMethod,
    handleConfirmCreate,
    isLoadingCreateData,
    isCreatingOrder,
    setCreateStep,
  };
};
