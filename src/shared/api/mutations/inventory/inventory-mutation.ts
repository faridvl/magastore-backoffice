import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useApiMutation } from '../use-api-mutation';
import { Product } from '@/types/inventory/product.types';

export type ProductApiPayload = Omit<Product, 'uuid' | 'tenantUuid' | 'isActive' | 'createdAt'>;

export function useCreateProductMutation() {
  const {
    mutate: executeCreateProduct,
    isPending,
    isSuccess,
    error,
    reset,
  } = useApiMutation({
    mutationKey: ['createProduct'],
    mutationFn: (payload: ProductApiPayload) =>
      ApiServiceClient(env.API.MEDICAL_RECORDS_URL).post('/products', payload),
  });

  return {
    executeCreateProduct,
    isPending,
    isSuccess,
    error: !!error,
    reset,
  };
}

export function useUpdateProductMutation() {
  const {
    mutate: executeUpdateProduct,
    isPending,
    isSuccess,
    error,
    reset,
  } = useApiMutation({
    mutationKey: ['updateProduct'],
    mutationFn: ({
      uuid,
      payload,
    }: {
      uuid: string;
      payload: Partial<ProductApiPayload> & { isActive?: boolean };
    }) => ApiServiceClient(env.API.MEDICAL_RECORDS_URL).patch(`/products/${uuid}`, payload),
  });

  return {
    executeUpdateProduct,
    isPending,
    isSuccess,
    error: !!error,
    reset,
  };
}
