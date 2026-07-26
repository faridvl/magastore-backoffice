import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CustomerType, CustomerTypeInput } from '@/types/customer/customer.types';
import { CUSTOMER_TYPES_KEY } from '../../querys/customers/use-customer-types-query';

export function useCreateCustomerTypeMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: createCustomerType, isPending, error, reset } = useApiMutation<
    { data: CustomerType },
    CustomerTypeInput,
    Error
  >({
    mutationKey: ['createCustomerType'],
    mutationFn: (data: CustomerTypeInput) => ApiServiceClient(env.API.BASE_URL).post('/customer-types', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPES_KEY] });
    },
  });
  return { createCustomerType, isPending, error, reset };
}

export function useUpdateCustomerTypeMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateCustomerType, isPending, error, reset } = useApiMutation<
    { data: CustomerType },
    { uuid: string } & CustomerTypeInput,
    Error
  >({
    mutationKey: ['updateCustomerType'],
    mutationFn: ({ uuid, ...data }) => ApiServiceClient(env.API.BASE_URL).patch('/customer-types', { uuid, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPES_KEY] });
    },
  });
  return { updateCustomerType, isPending, error, reset };
}

export function useToggleCustomerTypeActiveMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: toggleCustomerTypeActive, isPending, error, reset } = useApiMutation<
    { data: CustomerType },
    { uuid: string; isActive: boolean },
    Error
  >({
    mutationKey: ['toggleCustomerTypeActive'],
    mutationFn: ({ uuid, isActive }) => ApiServiceClient(env.API.BASE_URL).patch('/customer-types', { uuid, action: 'toggle-active', isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CUSTOMER_TYPES_KEY] });
    },
  });
  return { toggleCustomerTypeActive, isPending, error, reset };
}
