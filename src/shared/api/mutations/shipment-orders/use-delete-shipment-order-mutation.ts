import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';

export function useDeleteShipmentOrderMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteShipmentOrder, isPending } = useApiMutation<
    { data: { deleted: boolean } },
    { uuid: string },
    Error
  >({
    mutationKey: ['deleteShipmentOrder'],
    mutationFn: ({ uuid }) =>
      ApiServiceClient(env.API.BASE_URL).delete('/consolidations', { uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
    },
  });

  return { deleteShipmentOrder, isPending };
}
