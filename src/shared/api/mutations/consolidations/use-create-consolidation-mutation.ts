import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CreateConsolidationInput } from '@/types/logistics/logistics.types';
import { CONSOLIDATIONS_LIST_KEY } from '../../querys/consolidations/use-consolidations-query';

export function useCreateConsolidationMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: createConsolidation, isPending, error, reset } = useApiMutation<
    { data: { uuid: string } },
    CreateConsolidationInput,
    Error
  >({
    mutationKey: ['createConsolidation'],
    mutationFn: ({ customerUuid }: CreateConsolidationInput) =>
      ApiServiceClient(env.API.BASE_URL).post('/consolidations', { customerUuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CONSOLIDATIONS_LIST_KEY] });
    },
  });

  return { createConsolidation, isPending, error, reset };
}
