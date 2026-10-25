import { ApiServiceClient } from '@/shared/api/api-service-client';
import { BillingListItem, BillingListSummary, PaymentMethod } from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';
import { useApiQueryClient } from '../../query-hooks/use-api-client-query';

export const BILLING_LIST_KEY = 'billingList';

export type BillingListResponse = PaginatedResponse<BillingListItem> & { summary: BillingListSummary };

async function fetchBillingList(
  page: number,
  limit: number,
  search?: string,
  isPaid?: boolean,
  dateFrom?: string,
  dateTo?: string,
  paymentMethod?: PaymentMethod,
): Promise<BillingListResponse> {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (search) params.set('search', search);
  if (isPaid !== undefined) params.set('isPaid', String(isPaid));
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (paymentMethod) params.set('paymentMethod', paymentMethod);

  return ApiServiceClient(env.API.BASE_URL).get(`/billing?${params.toString()}`);
}

export function useBillingListQuery(
  page: number,
  limit: number,
  search?: string,
  isPaid?: boolean,
  dateFrom?: string,
  dateTo?: string,
  paymentMethod?: PaymentMethod,
) {
  const apiQueryClient = useApiQueryClient();

  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<BillingListResponse> => {
    return useApiQuery({
      queryKey: [BILLING_LIST_KEY, page, limit, search ?? '', isPaid ?? null, dateFrom ?? '', dateTo ?? '', paymentMethod ?? ''],
      queryFn: () => fetchBillingList(page, limit, search, isPaid, dateFrom, dateTo, paymentMethod),
      staleTime: 1000 * 60 * 5,
      placeholderData: (prev: unknown) => prev,
      ...options,
    } as any);
  };

  async function invalidate() {
    await apiQueryClient.invalidateQueries({ queryKey: [BILLING_LIST_KEY] });
  }

  return { useQuery, invalidate };
}
