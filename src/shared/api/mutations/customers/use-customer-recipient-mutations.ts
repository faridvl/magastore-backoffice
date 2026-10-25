import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CustomerRecipient, CustomerRecipientInput } from '@/types/customer/customer.types';
import { CUSTOMER_RECIPIENTS_KEY } from '../../querys/customers/use-customer-recipients-query';

export function useCustomerRecipientMutations(customerId: string) {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: [CUSTOMER_RECIPIENTS_KEY, customerId] });

  const saveMutation = useMutation<{ data: CustomerRecipient[] }, Error, CustomerRecipientInput>({
    mutationFn: (recipient) => ApiServiceClient(env.API.BASE_URL).put(`/customers/${customerId}/recipients`, recipient),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation<{ data: CustomerRecipient[] }, Error, string>({
    mutationFn: (recipientId) =>
      ApiServiceClient(env.API.BASE_URL).delete(`/customers/${customerId}/recipients?recipientId=${recipientId}`),
    onSuccess: invalidate,
  });

  return {
    saveRecipient: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteRecipient: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
