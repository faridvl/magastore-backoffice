import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { MarkPaidInput, BillingListItem } from '@/types/logistics/logistics.types';
import { BILLING_LIST_KEY } from '../../querys/billing/use-billing-list-query';

export function useMarkPaidMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: markAsPaid, isPending, error, reset } = useApiMutation<
    { data: Partial<BillingListItem> },
    MarkPaidInput,
    Error
  >({
    mutationKey: ['markBillingPaid'],
    mutationFn: ({ billingUuid }: MarkPaidInput) =>
      ApiServiceClient(env.API.BASE_URL).patch(`/billing?uuid=${billingUuid}`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BILLING_LIST_KEY] });
    },
  });

  return { markAsPaid, isPending, error, reset };
}
