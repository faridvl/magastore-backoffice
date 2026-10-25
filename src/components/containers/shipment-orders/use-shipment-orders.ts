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
  // Finalizadas despachadas hace 3 a 30 días sin seguimiento postventa.
  SEGUIMIENTO_PENDIENTE = 'SEGUIMIENTO_PENDIENTE',
}

// Pasos que la URL puede pedir; `ALL` no es un paso y se excluye a propósito.
const STEP_FILTER_URL_KEYS = [
  'CONFIRMACION',
  'COBRO',
  'DESPACHO',
  'NOTIFICACION',
  'FINALIZADA',
  'SEGUIMIENTO_PENDIENTE',
] as const;
type StepFilterUrlKey = (typeof STEP_FILTER_URL_KEYS)[number];

const PAID_FILTER_URL_KEYS = ['ALL', 'SIN_ESTIMADO', 'ESTIMADO_ENVIADO', 'POR_COBRAR', 'PAGADA'] as const;
// Nombres viejos que todavía pueden venir en enlaces: valen lo mismo que el nuevo.
const PAID_FILTER_URL_ALIASES: Record<string, (typeof PAID_FILTER_URL_KEYS)[number]> = {
  FACTURADA_SIN_PAGAR: 'POR_COBRAR',
  SIN_PAGAR: 'POR_COBRAR',
};
const NOTIFIED_FILTER_URL_KEYS = ['ALL', 'NOTIFICADA', 'SIN_NOTIFICAR'] as const;

const isStepFilterUrlKey = (name: string): name is StepFilterUrlKey =>
  (STEP_FILTER_URL_KEYS as readonly string[]).includes(name);

// Cuatro nombres del badge de pago; cada uno filtra con la misma regla que `getPaymentStatus`.
export enum ShipmentOrderPaidFilter {
  ALL = 'ALL',
  SIN_ESTIMADO = 'SIN_ESTIMADO',
  ESTIMADO_ENVIADO = 'ESTIMADO_ENVIADO',
  POR_COBRAR = 'POR_COBRAR',
  PAGADA = 'PAGADA',
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
  // Sin filtros al entrar: un filtro preaplicado escondía órdenes sin que el operador lo notara.
  // El panel Operativo enlaza acá con ?payment=... (valores del enum viejo, ver el useEffect de
  // abajo) o con ?step=/?paid=/?notified= directos.
  // Varios pasos a la vez: el operador revisa, por ejemplo, Cobro y Despacho juntos.
  const [stepFilters, setStepFilters] = useState<ShipmentOrderStepFilter[]>([]);
  const [paidFilter, setPaidFilter] = useState<ShipmentOrderPaidFilter>(ShipmentOrderPaidFilter.ALL);
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
  // null = recibe el propio cliente.
  const [createRecipientId, setCreateRecipientId] = useState<string | null>(null);
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
      setPaidFilter(ShipmentOrderPaidFilter.POR_COBRAR);
      setStepFilters([]);
      touched = true;
    } else if (legacyPayment === 'PAGADO') {
      setPaidFilter(ShipmentOrderPaidFilter.PAGADA);
      touched = true;
    } else if (legacyPayment === 'ENTREGADO') {
      // Una orden pasa a entregada recién al finalizar (paso 5).
      setStepFilters([ShipmentOrderStepFilter.FINALIZADA]);
      setPaidFilter(ShipmentOrderPaidFilter.ALL);
      touched = true;
    }

    // Uno o varios pasos separados por coma (?step=COBRO,DESPACHO).
    const stepsFromUrl = (stepParam ?? '')
      .split(',')
      .map((name) => name.trim())
      .filter(isStepFilterUrlKey)
      .map((name) => ShipmentOrderStepFilter[name]);
    if (stepsFromUrl.length > 0) {
      setStepFilters(stepsFromUrl);
      // Mismo criterio que al elegirlo a mano: con "Sin pagar" casi no aparecería nada.
      if (stepsFromUrl.includes(ShipmentOrderStepFilter.SEGUIMIENTO_PENDIENTE) && !paidParam) setPaidFilter(ShipmentOrderPaidFilter.ALL);
      touched = true;
    }
    const paidKey = paidParam ? PAID_FILTER_URL_ALIASES[paidParam] ?? paidParam : undefined;
    if (paidKey && (PAID_FILTER_URL_KEYS as readonly string[]).includes(paidKey)) {
      setPaidFilter(ShipmentOrderPaidFilter[paidKey as (typeof PAID_FILTER_URL_KEYS)[number]]);
      touched = true;
    }
    if (notifiedParam && (NOTIFIED_FILTER_URL_KEYS as readonly string[]).includes(notifiedParam)) {
      setNotifiedFilter(
        ShipmentOrderNotifiedFilter[notifiedParam as (typeof NOTIFIED_FILTER_URL_KEYS)[number]],
      );
      touched = true;
    }

    if (touched) setPage(1);
  }, [router.isReady, router.query.payment, router.query.step, router.query.paid, router.query.notified]);

  const listQuery = useShipmentOrdersQuery(
    page,
    PAGE_SIZE,
    debouncedSearch || undefined,
    stepFilters.length > 0 ? stepFilters.join(',') : ShipmentOrderStepFilter.ALL,
    paidFilter,
    notifiedFilter,
    dateFrom || undefined,
    dateTo || undefined,
  );
  const { data: listData, isLoading: isLoadingList, isError, refetch } = listQuery.useQuery();
  // Con datos ya cargados, un fallo de refresco no tapa la lista.
  const isErrorList = isError && !listData;
  const handleRetryList = () => { void refetch(); };

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
      setCreateRecipientId(null);
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
    const previousIds = new Set(createAddresses.map((a) => a.id));
    const created = addresses.find((a) => !previousIds.has(a.id));
    setCreateAddresses(addresses);
    setCreateAddressId((prev) => {
      // La recién creada se hizo para esta orden: queda elegida.
      if (created) return created.id;
      // La seleccionada sigue existiendo: se respeta, aunque el operador acabe
      // de editar otra.
      if (prev && addresses.some((a) => a.id === prev)) return prev;
      return addresses.find((a) => a.is_default)?.id ?? addresses[0]?.id ?? '';
    });
  };

  // En retiro en oficina no hay entrega: la orden se crea sin dirección.
  const handleConfirmCreate = async (isPickup: boolean) => {
    if (!createCustomer || createSelectedPackageUuids.length === 0 || !createDeliveryMethod) return;
    if (!isPickup && !createAddressId) return;
    try {
      const result = await createShipmentOrderWithPackages({
        customerUuid: createCustomer.customer_id,
        packageUuids: createSelectedPackageUuids,
        deliveryAddressId: isPickup ? undefined : createAddressId,
        recipientId: isPickup ? null : createRecipientId,
        deliveryMethod: createDeliveryMethod,
      });
      toast.success('Orden de envío creada correctamente');
      setCreateStep(null);
      const uuid = (result as { data?: { uuid?: string } } | undefined)?.data?.uuid;
      router.push(uuid ? `/admin/shipment-orders/${uuid}` : '/admin/shipment-orders');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo crear la orden de envío.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteUuid) return;
    try {
      await deleteShipmentOrder({ uuid: deleteUuid });
      setDeleteUuid(null);
      toast.success('Orden de envío eliminada');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo eliminar la orden de envío.');
    }
  };

  const handleStepFiltersChange = (values: ShipmentOrderStepFilter[]) => {
    // Con "Sin pagar" quedaría casi vacío el seguimiento: la mayoría ya pagó.
    const addsFollowUp = values.includes(ShipmentOrderStepFilter.SEGUIMIENTO_PENDIENTE)
      && !stepFilters.includes(ShipmentOrderStepFilter.SEGUIMIENTO_PENDIENTE);
    if (addsFollowUp) setPaidFilter(ShipmentOrderPaidFilter.ALL);
    setStepFilters(values);
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

  const clearDates = () => {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  };

  const handleSelectRow = (item: ConsolidationListItem) => {
    router.push(`/admin/shipment-orders/${item.uuid}`);
  };

  return {
    // List — 3 ejes de filtro independientes y combinables
    page, setPage,
    search, setSearch,
    stepFilters, handleStepFiltersChange,
    paidFilter, handlePaidFilterChange,
    notifiedFilter, handleNotifiedFilterChange,
    clearDates,
    dateFrom, setDateFrom: (v: string) => { setDateFrom(v); setPage(1); },
    dateTo, setDateTo: (v: string) => { setDateTo(v); setPage(1); },
    shipmentOrders: listData?.data ?? [],
    listMeta: listData?.meta ?? { total: 0, page: 1, limit: PAGE_SIZE, totalPages: 1 },
    isLoadingList,
    isErrorList, handleRetryList,

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
    createRecipientId, setCreateRecipientId,
    handleConfirmCreate,
    isLoadingCreateData,
    isCreatingOrder,
    setCreateStep,
  };
};
