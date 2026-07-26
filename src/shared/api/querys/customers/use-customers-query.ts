import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { Customer } from '@/types/customer/customer.types';
import { PaginatedResponse } from '@/types/paginate.types';

/**
 * Listado de clientes. `limit` viaja en la URL porque el backend lo tiene en 10
 * por defecto: sin pasarlo, las pantallas que filtran en memoria (listado de
 * clientes, selector del alta de paquetes) solo veían los 10 más recientes y un
 * cliente antiguo resultaba imposible de encontrar.
 */
export function useCustomersQuery(params?: { page?: number; limit?: number }) {
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 1000;

  return useQuery<PaginatedResponse<Customer>>({
    queryKey: ['customers', page, limit],
    queryFn: async () => {
      // El cliente de API debe retornar la respuesta completa (data + meta)
      const response = await ApiServiceClient(env.API.BASE_URL).get(
        `/customers?page=${page}&limit=${limit}`,
      );
      return response;
    },
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5, // 5 minutos de frescura
  });
}
