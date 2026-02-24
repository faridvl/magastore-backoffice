import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { useQueryClient } from '@tanstack/react-query';

export function useSettingsMutation() {
  const queryClient = useQueryClient();

  const {
    mutate: executeUpdate,
    isPending,
    error,
    reset,
  } = useApiMutation({
    mutationKey: ['updateSettings'],
    mutationFn: (newSettings: any) =>
      ApiServiceClient(env.API.BASE_URL).put('/settings', newSettings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['systemSettings'] });
    },
  });

  return { executeUpdate, isPending, error, reset };
}
