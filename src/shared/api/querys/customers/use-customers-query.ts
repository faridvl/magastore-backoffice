import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { Customer } from '@/types/customer/customer.types';
import { PaginatedResponse } from '@/types/paginate.types';

export function useCustomersQuery() {
  return useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers'],
    queryFn: async () => {
      // El cliente de API debe retornar la respuesta completa (data + meta)
      const response = await ApiServiceClient(env.API.BASE_URL).get('/customers');
      return response;
    },
    staleTime: 1000 * 60 * 5, // 5 minutos de frescura
  });
}
