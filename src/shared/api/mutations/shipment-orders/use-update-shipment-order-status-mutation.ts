import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { UpdateConsolidationStatusInput } from '@/types/logistics/logistics.types';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';
import { SHIPMENT_ORDER_DETAIL_KEY } from '../../querys/shipment-orders/use-shipment-order-detail-query';
import { PENDING_CONSOLIDATIONS_KEY } from '../../querys/billing/use-pending-consolidations-query';

export function useUpdateShipmentOrderStatusMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: updateStatus, isPending, error, reset } = useApiMutation<
    { data: { uuid: string } },
    UpdateConsolidationStatusInput & { currentStatus: string },
    Error
  >({
    mutationKey: ['updateShipmentOrderStatus'],
    mutationFn: ({ consolidationUuid, status, currentStatus }) =>
      ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        consolidationUuid,
        newStatus: status,
        currentStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDER_DETAIL_KEY] });
      queryClient.invalidateQueries({ queryKey: [PENDING_CONSOLIDATIONS_KEY] });
    },
  });

  return { updateStatus, isPending, error, reset };
}
