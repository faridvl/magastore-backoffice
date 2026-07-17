import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { DeliveryRate, DeliveryRateInput } from '@/types/logistics/logistics.types';
import { DELIVERY_RATES_KEY } from '../../querys/settings/use-delivery-rates-query';

export function useCreateDeliveryRateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: createDeliveryRate, isPending, error, reset } = useApiMutation<
    { data: DeliveryRate },
    DeliveryRateInput,
    Error
  >({
    mutationKey: ['createDeliveryRate'],
    mutationFn: (data: DeliveryRateInput) => ApiServiceClient(env.API.BASE_URL).post('/delivery-rates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_RATES_KEY] });
    },
  });
  return { createDeliveryRate, isPending, error, reset };
}

export function useUpdateDeliveryRateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateDeliveryRate, isPending, error, reset } = useApiMutation<
    { data: DeliveryRate },
    { uuid: string } & DeliveryRateInput,
    Error
  >({
    mutationKey: ['updateDeliveryRate'],
    mutationFn: ({ uuid, ...data }) => ApiServiceClient(env.API.BASE_URL).patch('/delivery-rates', { uuid, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_RATES_KEY] });
    },
  });
  return { updateDeliveryRate, isPending, error, reset };
}

export function useDeleteDeliveryRateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: deleteDeliveryRate, isPending, error, reset } = useApiMutation<
    { data: { deleted: boolean } },
    { uuid: string },
    Error
  >({
    mutationKey: ['deleteDeliveryRate'],
    mutationFn: ({ uuid }) => ApiServiceClient(env.API.BASE_URL).delete('/delivery-rates', { uuid }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_RATES_KEY] });
    },
  });
  return { deleteDeliveryRate, isPending, error, reset };
}

export function useToggleDeliveryRateActiveMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: toggleDeliveryRateActive, isPending, error, reset } = useApiMutation<
    { data: DeliveryRate },
    { uuid: string; isActive: boolean },
    Error
  >({
    mutationKey: ['toggleDeliveryRateActive'],
    mutationFn: ({ uuid, isActive }) => ApiServiceClient(env.API.BASE_URL).patch('/delivery-rates', { uuid, action: 'toggle-active', isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [DELIVERY_RATES_KEY] });
    },
  });
  return { toggleDeliveryRateActive, isPending, error, reset };
}
