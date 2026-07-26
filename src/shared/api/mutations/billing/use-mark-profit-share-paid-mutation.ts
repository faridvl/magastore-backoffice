import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { MarkPeriodPaidInput } from '@/types/logistics/logistics.types';
import { PROFIT_SHARE_KEY } from '../../querys/billing/use-profit-share-query';

export function useMarkProfitSharePaidMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: markPeriodPaid, isPending, error, reset } = useApiMutation<
    { data: { period: string; is_paid: boolean; paid_at: string | null } },
    MarkPeriodPaidInput,
    Error
  >({
    mutationKey: ['markProfitSharePeriodPaid'],
    mutationFn: ({ period, isPaid }: MarkPeriodPaidInput) =>
      ApiServiceClient(env.API.BASE_URL).post('/billing/profit-share-paid', { period, isPaid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [PROFIT_SHARE_KEY] });
    },
  });

  return { markPeriodPaid, isPending, error, reset };
}
