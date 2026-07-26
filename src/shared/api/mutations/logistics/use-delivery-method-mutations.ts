import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { DeliveryMethodEntity, DeliveryMethodInput } from '@/types/logistics/logistics.types';
import { DELIVERY_METHODS_KEY } from '../../querys/logistics/use-delivery-methods-query';

export function useCreateDeliveryMethodMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: createDeliveryMethod, isPending, error, reset } = useApiMutation<
    { data: DeliveryMethodEntity },
    DeliveryMethodInput,
    Error
  >({
    mutationKey: ['createDeliveryMethod'],
    mutationFn: (data: DeliveryMethodInput) => ApiServiceClient(env.API.BASE_URL).post('/delivery-methods', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_METHODS_KEY] });
    },
  });
  return { createDeliveryMethod, isPending, error, reset };
}

export function useUpdateDeliveryMethodMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateDeliveryMethod, isPending, error, reset } = useApiMutation<
    { data: DeliveryMethodEntity },
    { uuid: string } & DeliveryMethodInput,
    Error
  >({
    mutationKey: ['updateDeliveryMethod'],
    mutationFn: ({ uuid, ...data }) => ApiServiceClient(env.API.BASE_URL).patch('/delivery-methods', { uuid, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_METHODS_KEY] });
    },
  });
  return { updateDeliveryMethod, isPending, error, reset };
}

export function useToggleDeliveryMethodActiveMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: toggleDeliveryMethodActive, isPending, error, reset } = useApiMutation<
    { data: DeliveryMethodEntity },
    { uuid: string; isActive: boolean },
    Error
  >({
    mutationKey: ['toggleDeliveryMethodActive'],
    mutationFn: ({ uuid, isActive }) => ApiServiceClient(env.API.BASE_URL).patch('/delivery-methods', { uuid, action: 'toggle-active', isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_METHODS_KEY] });
    },
  });
  return { toggleDeliveryMethodActive, isPending, error, reset };
}
