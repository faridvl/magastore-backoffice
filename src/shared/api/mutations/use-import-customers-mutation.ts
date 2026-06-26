import { useApiMutation } from './use-api-mutation';
import { ApiServiceClient } from '../api-service-client';
import { env } from '../config';
import { CustomerImportRow, CustomerImportResult } from '@/types/customer/customer.types';

export function useImportCustomersMutation() {
  return useApiMutation<{ data: CustomerImportResult }, unknown, CustomerImportRow[]>({
    mutationFn: async (rows) => {
      return ApiServiceClient(env.API.BASE_URL).post('/customers/import', { rows });
    },
  });
}
