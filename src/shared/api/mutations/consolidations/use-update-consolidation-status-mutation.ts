import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { UpdateConsolidationStatusInput } from '@/types/logistics/logistics.types';
import { CONSOLIDATIONS_LIST_KEY } from '../../querys/consolidations/use-consolidations-query';
import { CONSOLIDATION_DETAIL_KEY } from '../../querys/consolidations/use-consolidation-detail-query';
import { PENDING_CONSOLIDATIONS_KEY } from '../../querys/billing/use-pending-consolidations-query';

export function useUpdateConsolidationStatusMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: updateStatus, isPending, error, reset } = useApiMutation<
    { data: { uuid: string } },
    UpdateConsolidationStatusInput & { currentStatus: string },
    Error
  >({
    mutationKey: ['updateConsolidationStatus'],
    mutationFn: ({ consolidationUuid, status, currentStatus }) =>
      ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
        consolidationUuid,
        newStatus: status,
        currentStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSOLIDATIONS_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [CONSOLIDATION_DETAIL_KEY] });
      queryClient.invalidateQueries({ queryKey: [PENDING_CONSOLIDATIONS_KEY] });
    },
  });

  return { updateStatus, isPending, error, reset };
}
