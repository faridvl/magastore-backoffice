import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';

export function useSendInvoiceEmailMutation() {
  const { mutateAsync: sendInvoiceEmail, isPending, reset } = useApiMutation<
    { data: { sent_to: string } },
    string,
    Error
  >({
    mutationKey: ['sendInvoiceEmail'],
    mutationFn: (billingUuid: string) =>
      ApiServiceClient(env.API.BASE_URL).post('/billing/send-email', { billingUuid }),
  });

  return { sendInvoiceEmail, isPending, reset };
}
