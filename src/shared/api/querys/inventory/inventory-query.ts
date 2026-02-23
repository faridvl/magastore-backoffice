import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { Product } from '@/types/inventory/product.types';
import { useQuery } from '@tanstack/react-query';

const URL = env.API.MEDICAL_RECORDS_URL;

export const ProductsService = {
  fetchAll: async (includeInactive = false): Promise<Product[]> => {
    return await ApiServiceClient(URL).get<Product[]>(
      `/products?includeInactive=${includeInactive}`,
    );
  },
};

export const FETCH_PRODUCTS_KEY = 'fetchProducts';

export function useProductsQuery(includeInactive = false) {
  return useQuery({
    queryKey: [FETCH_PRODUCTS_KEY, includeInactive],
    queryFn: () => ProductsService.fetchAll(includeInactive),
  });
}
