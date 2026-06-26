import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { Package, PackageStatus } from '@/types/logistics/logistics.types';

interface UpdateStatusPayload {
  status: PackageStatus;
  note?: string;
  location?: string;
}

export function useUpdatePackageStatusMutation(uuid: string | undefined) {
  const queryClient = useQueryClient();

  const { mutateAsync, isPending, error, reset } = useApiMutation<
    Partial<Package>,
    any,
    UpdateStatusPayload
  >({
    mutationKey: ['updatePackageStatus', uuid],
    mutationFn: (data) =>
      ApiServiceClient(env.API.BASE_URL).patch(`/logistics?uuid=${uuid}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fetchPackageDetail', uuid] });
      queryClient.invalidateQueries({ queryKey: ['packagesList'] });
    },
  });

  return { mutateAsync, isPending, error, reset };
}
