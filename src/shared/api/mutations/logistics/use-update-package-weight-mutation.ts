import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { Package } from '@/types/logistics/logistics.types';

export function useUpdatePackageWeightMutation(uuid: string | undefined) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error, reset } = useApiMutation<
    Partial<Package>,
    any,
    { weight_lb: number }
  >({
    mutationKey: ['updatePackageWeight', uuid],
    mutationFn: (data) =>
      ApiServiceClient(env.API.BASE_URL).patch(`/logistics?uuid=${uuid}`, {
        action: 'weight',
        ...data,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchPackageDetail', uuid] });
      queryClient.invalidateQueries({ queryKey: ['logistics'], exact: false });
    },
  });

  return { mutateAsync, isPending, error, reset };
}
