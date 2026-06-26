import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { Customer, CustomerInput } from '@/types/customer/customer.types';

export function useCreateCustomerMutation() {
  const queryClient = useQueryClient();

  const {
    mutate: execute,
    mutateAsync: executeCreate,
    isPending,
    error,
    reset,
  } = useApiMutation<Customer, any, CustomerInput>({
    mutationKey: ['createCustomer'],
    mutationFn: (newCustomer) => ApiServiceClient(env.API.BASE_URL).post('/customers', newCustomer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return { execute, executeCreate, isPending, error, reset };
}
