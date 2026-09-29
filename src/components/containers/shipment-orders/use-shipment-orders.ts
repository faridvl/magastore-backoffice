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

// Reemplaza al viejo ShipmentOrderPaymentFilter (enum único de 5 valores
// mutuamente excluyentes): son 3 ejes independientes y combinables, porque el
// dueño necesita poder cruzar "paso 2" con "sin pagar" con "notificada" — algo
// que un solo valor de filtro no podía expresar.
export enum ShipmentOrderStepFilter {
  ALL = 'ALL',
  CONFIRMACION = '1',
  COBRO = '2',
  DESPACHO = '3',
  NOTIFICACION = '4',
  FINALIZADA = '5',
}

export enum ShipmentOrderPaidFilter {
  ALL = 'ALL',
  PAGADA = 'PAGADA',
  SIN_PAGAR = 'SIN_PAGAR',
}

export enum ShipmentOrderNotifiedFilter {
  ALL = 'ALL',
  NOTIFICADA = 'NOTIFICADA',
  SIN_NOTIFICAR = 'SIN_NOTIFICAR',
}

const PAGE_SIZE = 10;

export const useShipmentOrders = () => {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  // Default: "sin pagar" en todos los pasos — es lo que el operador revisa a
  // diario. El panel Operativo enlaza acá con ?payment=... (valores del enum
  // viejo, ver el useEffect de abajo) o, desde otros lugares nuevos, con
  // ?step=/?paid=/?notified= directos.
  const [stepFilter, setStepFilter] = useState<ShipmentOrderStepFilter>(ShipmentOrderStepFilter.ALL);
  const [paidFilter, setPaidFilter] = useState<ShipmentOrderPaidFilter>(ShipmentOrderPaidFilter.SIN_PAGAR);
  const [notifiedFilter, setNotifiedFilter] = useState<ShipmentOrderNotifiedFilter>(ShipmentOrderNotifiedFilter.ALL);
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
  //
  // ?payment=... es el nombre viejo (dashboard Operativo, enum único de antes)
  // y se traduce al eje que le corresponde: SIN_NOTIFICAR → notified,
  // PENDIENTE_PAGO/PAGADO/ENTREGADO → paid/step. ?step=/?paid=/?notified= son
  // los nombres nuevos, para enlaces que quieran fijar un eje sin pasar por la
  // traducción.
  useEffect(() => {
    if (!router.isReady) return;
    // Acceso directo (no vía helper) para que exhaustive-deps pueda verificar
    // cada dependencia del array de abajo — mismo patrón que el efecto
    // original con router.query.payment.
    const rawPayment = router.query.payment;
    const rawStep = router.query.step;
    const rawPaid = router.query.paid;
    const rawNotified = router.query.notified;
    const legacyPayment = Array.isArray(rawPayment) ? rawPayment[0] : rawPayment;
    const stepParam = Array.isArray(rawStep) ? rawStep[0] : rawStep;
    const paidParam = Array.isArray(rawPaid) ? rawPaid[0] : rawPaid;
    const notifiedParam = Array.isArray(rawNotified) ? rawNotified[0] : rawNotified;
    let touched = false;

    if (legacyPayment === 'SIN_NOTIFICAR') {
      setNotifiedFilter(ShipmentOrderNotifiedFilter.SIN_NOTIFICAR);
      touched = true;
    } else if (legacyPayment === 'PENDIENTE_PAGO') {
      setPaidFilter(ShipmentOrderPaidFilter.SIN_PAGAR);
      setStepFilter(ShipmentOrderStepFilter.ALL);
      touched = true;
    } else if (legacyPayment === 'PAGADO') {
      setPaidFilter(ShipmentOrderPaidFilter.PAGADA);
      touched = true;
    } else if (legacyPayment === 'ENTREGADO') {
      // "Entregada" (status) ahora cubre dos pasos del wizard (4 y 5): el
      // enlace legado apunta al 4 (Notificación y cierre), que es donde una
      // orden recién entregada aterriza — sin filtro de step no se podría
      // distinguir "recién entregada, con seguimiento pendiente" de
      // "finalizada hace tiempo" en un solo valor.
      setStepFilter(ShipmentOrderStepFilter.NOTIFICACION);
      touched = true;
    }

    if (stepParam && stepParam in ShipmentOrderStepFilter) {
      setStepFilter(ShipmentOrderStepFilter[stepParam as keyof typeof ShipmentOrderStepFilter]);
      touched = true;
    }
    if (paidParam && paidParam in ShipmentOrderPaidFilter) {
      setPaidFilter(ShipmentOrderPaidFilter[paidParam as keyof typeof ShipmentOrderPaidFilter]);
      touched = true;
    }
    if (notifiedParam && notifiedParam in ShipmentOrderNotifiedFilter) {
      setNotifiedFilter(ShipmentOrderNotifiedFilter[notifiedParam as keyof typeof ShipmentOrderNotifiedFilter]);
      touched = true;
    }

    if (touched) setPage(1);
  }, [router.isReady, router.query.payment, router.query.step, router.query.paid, router.query.notified]);

  const listQuery = useShipmentOrdersQuery(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
    stepFilter,
    paidFilter,
    notifiedFilter,
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

  const handleStepFilterChange = (val: ShipmentOrderStepFilter) => {
    setStepFilter(val);
    setPage(1);
  };

  const handlePaidFilterChange = (val: ShipmentOrderPaidFilter) => {
    setPaidFilter(val);
    setPage(1);
  };

  const handleNotifiedFilterChange = (val: ShipmentOrderNotifiedFilter) => {
    setNotifiedFilter(val);
    setPage(1);
  };

  const clearFilters = () => {
    setStepFilter(ShipmentOrderStepFilter.ALL);
    setPaidFilter(ShipmentOrderPaidFilter.ALL);
    setNotifiedFilter(ShipmentOrderNotifiedFilter.ALL);
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const activeFilterCount = [
    stepFilter !== ShipmentOrderStepFilter.ALL,
    paidFilter !== ShipmentOrderPaidFilter.ALL,
    notifiedFilter !== ShipmentOrderNotifiedFilter.ALL,
    !!dateFrom,
    !!dateTo,
  ].filter(Boolean).length;

  const handleSelectRow = (item: ConsolidationListItem) => {
    router.push(`/admin/shipment-orders/${item.uuid}`);
  };

  return {
    // List — 3 ejes de filtro independientes y combinables
    page, setPage,
    search, setSearch,
    stepFilter, handleStepFilterChange,
    paidFilter, handlePaidFilterChange,
    notifiedFilter, handleNotifiedFilterChange,
    clearFilters,
    activeFilterCount,
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
