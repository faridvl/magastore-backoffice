import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CustomerWarehouseRoute } from '@/types/customer/customer.types';

/**
 * Casilleros asignados a un cliente. Filtra el selector de courier al registrar
 * un paquete y alimenta la asignación desde la ficha del cliente.
 */
export function useCustomerWarehouseCodesQuery(customerId?: string) {
  return useQuery<{ data: CustomerWarehouseRoute[] }>({
    queryKey: ['customer-warehouse-codes', customerId],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get(`/customers/${customerId}/warehouse-codes`),
    enabled: !!customerId,
    staleTime: 1000 * 60 * 5,
  });
}
