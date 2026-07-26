import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CourierRate, CourierRateInput } from '@/types/logistics/logistics.types';
import { COURIER_RATES_KEY } from '../../querys/settings/use-courier-rates-query';

export function useCreateCourierRateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: createCourierRate, isPending, error, reset } = useApiMutation<
    { data: CourierRate },
    CourierRateInput,
    Error
  >({
    mutationKey: ['createCourierRate'],
    mutationFn: (data: CourierRateInput) => ApiServiceClient(env.API.BASE_URL).post('/courier-rates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COURIER_RATES_KEY] });
      // El formulario de registro de paquete usa el endpoint viejo con su
      // propia key — refrescarlo también para que vea la tarifa recién editada.
      queryClient.invalidateQueries({ queryKey: ['courier-rates'] });
    },
  });
  return { createCourierRate, isPending, error, reset };
}

export function useUpdateCourierRateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateCourierRate, isPending, error, reset } = useApiMutation<
    { data: CourierRate },
    { uuid: string } & CourierRateInput,
    Error
  >({
    mutationKey: ['updateCourierRate'],
    mutationFn: ({ uuid, ...data }) => ApiServiceClient(env.API.BASE_URL).patch('/courier-rates', { uuid, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COURIER_RATES_KEY] });
      // El formulario de registro de paquete usa el endpoint viejo con su
      // propia key — refrescarlo también para que vea la tarifa recién editada.
      queryClient.invalidateQueries({ queryKey: ['courier-rates'] });
    },
  });
  return { updateCourierRate, isPending, error, reset };
}

export function useSetDefaultCourierRateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: setDefaultCourierRate, isPending, error, reset } = useApiMutation<
    { data: CourierRate },
    { uuid: string },
    Error
  >({
    mutationKey: ['setDefaultCourierRate'],
    mutationFn: ({ uuid }) => ApiServiceClient(env.API.BASE_URL).patch('/courier-rates', { uuid, action: 'set-default' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COURIER_RATES_KEY] });
      queryClient.invalidateQueries({ queryKey: ['courier-rates'] });
    },
  });
  return { setDefaultCourierRate, isPending, error, reset };
}

export function useToggleCourierRateActiveMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: toggleCourierRateActive, isPending, error, reset } = useApiMutation<
    { data: CourierRate },
    { uuid: string; isActive: boolean },
    Error
  >({
    mutationKey: ['toggleCourierRateActive'],
    mutationFn: ({ uuid, isActive }) => ApiServiceClient(env.API.BASE_URL).patch('/courier-rates', { uuid, action: 'toggle-active', isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [COURIER_RATES_KEY] });
      // El formulario de registro de paquete usa el endpoint viejo con su
      // propia key — refrescarlo también para que vea la tarifa recién editada.
      queryClient.invalidateQueries({ queryKey: ['courier-rates'] });
    },
  });
  return { toggleCourierRateActive, isPending, error, reset };
}
