import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { Customer, CustomerUpdateInput } from '@/types/customer/customer.types';

export function useUpdateCustomerMutation(customerId: string) {
  const queryClient = useQueryClient();

  const { mutateAsync: updateCustomer, isPending, error, reset } = useApiMutation<
    Customer,
    any,
    CustomerUpdateInput
  >({
    mutationKey: ['updateCustomer', customerId],
    mutationFn: (data) =>
      ApiServiceClient(env.API.BASE_URL).put(`/customers/${customerId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return { updateCustomer, isPending, error, reset };
}
