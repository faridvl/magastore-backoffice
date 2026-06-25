import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { GenerateInvoiceInput, Billing } from '@/types/logistics/logistics.types';
import { BILLING_LIST_KEY } from '../../querys/billing/use-billing-list-query';
import { PENDING_CONSOLIDATIONS_KEY } from '../../querys/billing/use-pending-consolidations-query';

export function useGenerateInvoiceMutation() {
  const queryClient = useQueryClient();

  const { mutateAsync: generateInvoice, isPending, error, reset } = useApiMutation<
    Partial<Billing>,
    GenerateInvoiceInput,
    Error
  >({
    mutationKey: ['generateInvoice'],
    mutationFn: (input: GenerateInvoiceInput) =>
      ApiServiceClient(env.API.BASE_URL).post('/logistics?action=invoice', input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [BILLING_LIST_KEY] });
      queryClient.invalidateQueries({ queryKey: [PENDING_CONSOLIDATIONS_KEY] });
    },
  });

  return { generateInvoice, isPending, error, reset };
}
