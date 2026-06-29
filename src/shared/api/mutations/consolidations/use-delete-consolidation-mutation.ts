import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CONSOLIDATIONS_LIST_KEY } from '../../querys/consolidations/use-consolidations-query';

export function useDeleteConsolidationMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: deleteConsolidation, isPending } = useApiMutation<
    { data: { deleted: boolean } },
    { uuid: string },
    Error
  >({
    mutationKey: ['deleteConsolidation'],
    mutationFn: ({ uuid }) =>
      ApiServiceClient(env.API.BASE_URL).delete('/consolidations', { uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSOLIDATIONS_LIST_KEY] });
    },
  });

  return { deleteConsolidation, isPending };
}
