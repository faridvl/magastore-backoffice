import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { Package, PackageInput } from '@/types/logistics/logistics.types';

export function useCreatePackageMutation() {
  const queryClient = useQueryClient();

  const {
    mutateAsync: executeCreate,
    isPending,
    error,
    reset,
  } = useApiMutation<Package, any, PackageInput>({
    mutationKey: ['createPackage'],
    mutationFn: (newPackage) =>
      ApiServiceClient(env.API.BASE_URL).post('/logistics?action=register', newPackage),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['packagesList'] });
    },
  });

  return { executeCreate, isPending, error, reset };
}
