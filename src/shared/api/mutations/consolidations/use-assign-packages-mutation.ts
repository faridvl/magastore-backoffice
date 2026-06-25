import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { AssignPackagesToConsolidationInput } from '@/types/logistics/logistics.types';
import { CONSOLIDATIONS_LIST_KEY } from '../../querys/consolidations/use-consolidations-query';
import { CONSOLIDATION_DETAIL_KEY } from '../../querys/consolidations/use-consolidation-detail-query';
import { AVAILABLE_PACKAGES_KEY } from '../../querys/consolidations/use-available-packages-query';

export function useAssignPackagesMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: assignPackages, isPending, error, reset } = useApiMutation<
    unknown,
    AssignPackagesToConsolidationInput,
    Error
  >({
    mutationKey: ['assignPackages'],
    mutationFn: ({ consolidationUuid, packageUuids }: AssignPackagesToConsolidationInput) =>
      ApiServiceClient(env.API.BASE_URL).post('/logistics?action=consolidate', {
        consolidationUuid,
        packageUuids,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSOLIDATIONS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONSOLIDATION_DETAIL_KEY] });
      queryClient.invalidateQueries({ queryKey: [AVAILABLE_PACKAGES_KEY] });
    },
  });

  return { assignPackages, isPending, error, reset };
}
