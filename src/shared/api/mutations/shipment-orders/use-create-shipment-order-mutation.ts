import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CreateConsolidationInput } from '@/types/logistics/logistics.types';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';

export function useCreateShipmentOrderMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: createShipmentOrder, isPending, error, reset } = useApiMutation<
    { data: { uuid: string } },
    CreateConsolidationInput,
    Error
  >({
    mutationKey: ['createShipmentOrder'],
    mutationFn: ({ customerUuid }: CreateConsolidationInput) =>
      ApiServiceClient(env.API.BASE_URL).post('/consolidations', { customerUuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
    },
  });

  return { createShipmentOrder, isPending, error, reset };
}
