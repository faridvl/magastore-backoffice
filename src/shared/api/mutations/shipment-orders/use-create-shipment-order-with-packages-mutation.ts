import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CreateConsolidationWithPackagesInput } from '@/types/logistics/logistics.types';
import { SHIPMENT_ORDERS_LIST_KEY } from '../../querys/shipment-orders/use-shipment-orders-query';

export function useCreateShipmentOrderWithPackagesMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: createShipmentOrderWithPackages, isPending, error, reset } = useApiMutation<
    { data: { uuid: string } },
    CreateConsolidationWithPackagesInput,
    Error
  >({
    mutationKey: ['createShipmentOrderWithPackages'],
    mutationFn: ({ customerUuid, packageUuids, deliveryAddressId, deliveryMethod }: CreateConsolidationWithPackagesInput) =>
      ApiServiceClient(env.API.BASE_URL).post('/consolidations', { customerUuid, packageUuids, deliveryAddressId, deliveryMethod }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: ['logistics'] });
    },
  });

  return { createShipmentOrderWithPackages, isPending, error, reset };
}
