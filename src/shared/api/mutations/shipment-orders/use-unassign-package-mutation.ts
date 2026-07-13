import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { UnassignPackageInput } from '@/types/logistics/logistics.types';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';
import { SHIPMENT_ORDER_DETAIL_KEY } from '../../querys/shipment-orders/use-shipment-order-detail-query';

export function useUnassignPackageMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: unassignPackage, isPending, error, reset } = useApiMutation<
    unknown,
    UnassignPackageInput,
    Error
  >({
    mutationKey: ['unassignPackage'],
    mutationFn: ({ packageUuid }: UnassignPackageInput) =>
      ApiServiceClient(env.API.BASE_URL).delete('/consolidations', {
        action: 'unassign-package',
        packageUuid,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDER_DETAIL_KEY] });
    },
  });

  return { unassignPackage, isPending, error, reset };
}
