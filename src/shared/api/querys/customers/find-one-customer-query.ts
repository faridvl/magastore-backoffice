import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { Customer } from '@/types/customer/customer.types';

export function useCustomerProfile(uuid?: string) {
  return useQuery<Customer>({
    queryKey: ['customer', uuid],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get(`/customers/${uuid}`),
    enabled: !!uuid, // Solo se ejecuta si el uuid existe
    staleTime: 1000 * 60 * 5, // 5 minutos de caché para datos de perfil
  });
}
