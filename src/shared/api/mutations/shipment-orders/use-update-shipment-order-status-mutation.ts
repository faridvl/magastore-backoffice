import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { UpdateConsolidationStatusInput } from '@/types/logistics/logistics.types';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';
import { SHIPMENT_ORDER_DETAIL_KEY } from '../../querys/shipment-orders/use-shipment-order-detail-query';

export function useUpdateShipmentOrderStatusMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: updateStatus, isPending, error, reset } = useApiMutation<
    { data: { uuid: string } },
    // trackingCode solo viaja al despachar; es opcional porque la guía puede
    // registrarse después (ver setTrackingCode).
    UpdateConsolidationStatusInput & { currentStatus: string; trackingCode?: string | null },
    Error
  >({
    mutationKey: ['updateShipmentOrderStatus'],
    mutationFn: ({ consolidationUuid, status, currentStatus, trackingCode }) =>
      ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        consolidationUuid,
        newStatus: status,
        currentStatus,
        trackingCode: trackingCode ?? null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDER_DETAIL_KEY] });
    },
  });

  return { updateStatus, isPending, error, reset };
}
