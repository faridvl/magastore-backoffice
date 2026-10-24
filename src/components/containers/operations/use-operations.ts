import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useOperationsQuery } from '@/shared/api/querys/dashboard/use-operations-query';
import { useBillingDetailQuery } from '@/shared/api/querys/billing/use-billing-detail-query';
import { useMarkPaidMutation } from '@/shared/api/mutations/billing/use-mark-paid-mutation';
import { useNotifyMultipleCustomers } from '@/hooks/use-notify-multiple-customers';
import { formatCrc } from '@/shared/utils/format-crc';
import { downloadPdf } from '@/shared/utils/download-pdf';
import {
  OperationsStats,
  PendingCollection,
  OperationsTask,
  OperationsTaskKey,
} from '@/types/dashboard/operations.types';
import { PaymentMethod, ShipmentOrderStep } from '@/types/logistics/logistics.types';
import { routesPrivate } from '@/shared/navigation/routes';
import {
  COLLECTION_OVERDUE_DAYS,
  COLLECTIONS_AWAITING_PAYMENT_VALUE,
  COLLECTIONS_PREVIEW_LIMIT,
  COLLECTIONS_TAB_PARAM,
  ESTIMATE_ROW_ANCHOR,
  OPERATIONS_ORDERS_QUERY,
  OPERATIONS_ORIGIN_QUERY,
  TASK_STALE_AFTER_DAYS,
  operationsOrdersHref,
} from '@/shared/constants/operations';
import {
  OPERATIONS_TASK_CONFIG,
  OperationsTaskConfig,
  formatConfirmAndCollectBreakdown,
} from './operations-tasks.config';

export enum CollectionsTab {
  TO_NOTIFY = 'TO_NOTIFY',
  AWAITING_PAYMENT = 'AWAITING_PAYMENT',
}

export interface CollectionCardItem extends PendingCollection {
  /** El estimado solo se envía desde el paso de cobro; en los demás se abre la factura. */
  canSendEstimate: boolean;
}

export interface CollectionsTabItem {
  value: CollectionsTab;
  label: string;
  total: number;
  id: string;
}

export interface OperationsTaskRow extends OperationsTask, OperationsTaskConfig {
  isStale: boolean;
  /** "La más vieja: hace 3 días"; null cuando no hay nada pendiente. */
  oldestLabel: string | null;
  countLabel: string;
}

const EMPTY_STATS: OperationsStats = {
  tasks: [],
  collections: {
    toNotify: { items: [], total: 0, totalCRC: 0 },
    awaitingPayment: { items: [], total: 0, totalCRC: 0 },
  },
};

export const TASK_SKELETON_ROWS = Object.keys(OPERATIONS_TASK_CONFIG).length;

export const COLLECTIONS_PANEL_ID = 'operations-collections-panel';

const MS_PER_MINUTE = 60 * 1000;
const MINUTES_PER_HOUR = 60;
const CLOCK_TICK_MS = 30 * 1000;

const formatDaysAgo = (days: number): string =>
  days === 0 ? 'de hoy' : `hace ${days} ${days === 1 ? 'día' : 'días'}`;

const formatUpdatedAt = (updatedAt: number, now: number): string => {
  const minutes = Math.max(0, Math.floor((now - updatedAt) / MS_PER_MINUTE));
  if (minutes < 1) return 'Actualizado hace un momento';
  if (minutes < MINUTES_PER_HOUR) return `Actualizado hace ${minutes} min`;
  return `Actualizado hace ${Math.floor(minutes / MINUTES_PER_HOUR)} h`;
};

const toTaskRow = (task: OperationsTask): OperationsTaskRow => {
  const config = OPERATIONS_TASK_CONFIG[task.key];
  return {
    ...task,
    ...config,
    isStale: task.oldestDays != null && task.oldestDays >= TASK_STALE_AFTER_DAYS[task.key],
    oldestLabel:
      task.oldestDays == null
        ? null
        : `${config.oldestPrefix ?? 'La más vieja'}: ${formatDaysAgo(task.oldestDays)}`,
    countLabel: task.breakdown
      ? formatConfirmAndCollectBreakdown(task.breakdown)
      : `${task.count} ${task.count === 1 ? config.unitSingular : config.unitPlural}`,
  };
};

export function useOperations() {
  const router = useRouter();
  const operationsQuery = useOperationsQuery();
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } = operationsQuery.useQuery();

  const stats: OperationsStats = data?.data ?? EMPTY_STATS;
  // Con datos en caché un fallo al refrescar no tapa la pantalla: solo avisa.
  const isErrorWithoutData = isError && !data;
  const hasRefreshError = isError && !!data;

  // Reloj para el "Actualizado hace X min": sin él la etiqueta quedaría fija
  // hasta el próximo render.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => clearInterval(timer);
  }, []);
  const updatedLabel = dataUpdatedAt > 0 ? formatUpdatedAt(dataUpdatedAt, now) : null;

  const taskRows = stats.tasks.map(toTaskRow);
  const pendingTasks = taskRows.filter((task) => task.count > 0);
  const doneTasks = taskRows.filter((task) => task.count === 0);

  // La pestaña vive en la URL para que al volver de "Ver todas" o de una orden siga la misma.
  const collectionsTab =
    router.query[COLLECTIONS_TAB_PARAM] === COLLECTIONS_AWAITING_PAYMENT_VALUE
      ? CollectionsTab.AWAITING_PAYMENT
      : CollectionsTab.TO_NOTIFY;
  const setCollectionsTab = (tab: CollectionsTab) => {
    const { [COLLECTIONS_TAB_PARAM]: _current, ...rest } = router.query;
    const query =
      tab === CollectionsTab.AWAITING_PAYMENT
        ? { ...rest, [COLLECTIONS_TAB_PARAM]: COLLECTIONS_AWAITING_PAYMENT_VALUE }
        : rest;
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };
  const isToNotifyTab = collectionsTab === CollectionsTab.TO_NOTIFY;
  const activeGroup = isToNotifyTab ? stats.collections.toNotify : stats.collections.awaitingPayment;
  const activeCollections = {
    ...activeGroup,
    items: activeGroup.items.map(
      (item): CollectionCardItem => ({
        ...item,
        canSendEstimate: isToNotifyTab && item.currentStep === ShipmentOrderStep.COBRO,
      }),
    ),
  };
  const collectionTabs: CollectionsTabItem[] = [
    {
      value: CollectionsTab.TO_NOTIFY,
      label: 'Por avisar',
      total: stats.collections.toNotify.total,
      id: 'operations-collections-tab-to-notify',
    },
    {
      value: CollectionsTab.AWAITING_PAYMENT,
      label: 'Ya avisados',
      total: stats.collections.awaitingPayment.total,
      id: 'operations-collections-tab-awaiting-payment',
    },
  ];
  const activeCollectionsTabId =
    collectionTabs.find((tab) => tab.value === collectionsTab)?.id ?? collectionTabs[0].id;
  const collectionsSummaryLabel = `${
    activeCollections.total <= COLLECTIONS_PREVIEW_LIMIT
      ? `${activeCollections.total} en total`
      : `Mostrando ${activeCollections.items.length} de ${activeCollections.total}`
  } · ${formatCrc(activeCollections.totalCRC)}`;
  const seeAllCollectionsHref = operationsOrdersHref(
    isToNotifyTab
      ? OPERATIONS_ORDERS_QUERY.collectionsToNotify
      : OPERATIONS_ORDERS_QUERY.collectionsAwaitingPayment,
  );

  const handleRefresh = () => {
    void refetch();
  };

  // --- Factura: se abre el mismo modal de detalle que usa la pantalla de
  // Facturación, con su desglose, PDF y "Marcar como Pagado".
  const [selectedBillingUuid, setSelectedBillingUuid] = useState<string | null>(null);
  const detailQuery = useBillingDetailQuery(selectedBillingUuid ?? '');
  const { data: detailResponse, isLoading: isLoadingDetail } = detailQuery.useQuery();
  const { markAsPaid, isPending: isMarkingPaid } = useMarkPaidMutation();

  const handleMarkAsPaid = async (paymentMethod: PaymentMethod) => {
    if (!selectedBillingUuid) return;
    try {
      await markAsPaid({ billingUuid: selectedBillingUuid, paymentMethod });
      await detailQuery.invalidate();
      await operationsQuery.invalidate();
      setSelectedBillingUuid(null);
      toast.success('Factura marcada como pagada');
    } catch {
      toast.error('No se pudo registrar el pago. Intenta de nuevo.');
    }
  };

  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  const handleDownloadPdf = async (uuid: string, invoiceNumber?: number) => {
    setIsDownloadingPdf(true);
    try {
      const label = invoiceNumber != null
        ? `F-${String(invoiceNumber).padStart(4, '0')}`
        : uuid.slice(-8).toUpperCase();
      await downloadPdf(`/api/billing/pdf?uuid=${uuid}`, `FACTURA-${label}.pdf`);
    } catch {
      toast.error('No se pudo descargar el PDF. Intenta de nuevo más tarde.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Mismo modal de aviso de "paquetes disponibles" que Logística. Al cerrarlo se
  // refresca el panel para que los clientes ya avisados salgan de la lista.
  const notifyMultiple = useNotifyMultipleCustomers();

  const closeNotifyModal = async () => {
    notifyMultiple.close();
    await operationsQuery.invalidate();
  };

  /**
   * El mensaje del estimado se arma con el desglose por paquete, las tarifas aplicadas
   * y el descuento del tipo de cliente. Esa lógica vive en el detalle de la orden
   * y no se duplica acá: se navega para que el mensaje salga de una sola fuente.
   */
  const goToOrder = (consolidationUuid: string) => {
    router.push(
      `${routesPrivate.admin.shipmentOrders.index}/${consolidationUuid}?${OPERATIONS_ORIGIN_QUERY}#${ESTIMATE_ROW_ANCHOR}`,
    );
  };

  const handleTaskAction = (key: OperationsTaskKey) => {
    const { href } = OPERATIONS_TASK_CONFIG[key];
    if (href) {
      router.push(href);
      return;
    }
    notifyMultiple.open();
  };

  return {
    isLoading,
    isErrorWithoutData,
    hasRefreshError,
    isRefreshing: isFetching,
    updatedLabel,
    handleRefresh,

    pendingTasks,
    doneTasks,
    taskSkeletonRows: TASK_SKELETON_ROWS,
    handleTaskAction,

    collectionsTab,
    setCollectionsTab,
    collectionTabs,
    activeCollectionsTabId,
    collectionsPanelId: COLLECTIONS_PANEL_ID,
    collectionsSummaryLabel,
    activeCollections,
    isToNotifyTab,
    seeAllCollectionsHref,
    collectionOverdueDays: COLLECTION_OVERDUE_DAYS,
    goToOrder,

    // Modal de factura
    selectedBillingUuid,
    setSelectedBillingUuid,
    billingDetail: detailResponse?.data ?? null,
    isLoadingDetail,
    handleMarkAsPaid,
    isMarkingPaid,
    handleDownloadPdf,
    isDownloadingPdf,

    // Modal de aviso de paquetes disponibles
    notifyMultiple,
    closeNotifyModal,
  };
}
