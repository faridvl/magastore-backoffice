import { ApiServiceClient } from '@/shared/api/api-service-client';
import { useQuery } from '@tanstack/react-query';
import { env } from '@/shared/api/config';
import { Product } from '@/types/inventory/product.types';

export const ProductDetailService = {
  getById: async (uuid: string): Promise<Product> => {
    return await ApiServiceClient(env.API.MEDICAL_RECORDS_URL).get<Product>(`/products/${uuid}`);
  },
};

export function useProductDetailQuery(productId: string) {
  return useQuery({
    queryKey: ['productDetail', productId],
    queryFn: () => ProductDetailService.getById(productId),
    enabled: !!productId,
  });
}
