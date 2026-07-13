import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';
import { SHIPMENT_ORDER_DETAIL_KEY } from '../../querys/shipment-orders/use-shipment-order-detail-query';

type AssignPackagesToOrderInput = {
  consolidationUuid: string;
  packageUuids: string[];
};

export function useAssignPackagesToOrderMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: assignPackagesToOrder, isPending, error, reset } = useApiMutation<
    { data: { assigned: boolean } },
    AssignPackagesToOrderInput,
    Error
  >({
    mutationKey: ['assignPackagesToOrder'],
    mutationFn: ({ consolidationUuid, packageUuids }: AssignPackagesToOrderInput) =>
      ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        action: 'assign-packages',
        consolidationUuid,
        packageUuids,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDER_DETAIL_KEY] });
      queryClient.invalidateQueries({ queryKey: ['logistics'] });
    },
  });

  return { assignPackagesToOrder, isPending, error, reset };
}
