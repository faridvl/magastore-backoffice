import { ApiServiceClient } from '@/shared/api/api-service-client';
import { ProfitShareMonthlyReport } from '@/types/logistics/logistics.types';
import { env } from '../../config';
import { useApiQuery, UseAPIQueryOptions, UseAPIQueryResult } from '../use-api-query-hook';

export const PROFIT_SHARE_KEY = 'profitShareReport';

async function fetchProfitShareReport(
  from?: string,
  to?: string,
): Promise<{ data: ProfitShareMonthlyReport[] }> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);

  const query = params.toString();
  return ApiServiceClient(env.API.BASE_URL).get(
    `/billing/profit-share${query ? `?${query}` : ''}`,
  );
}

/**
 * Sin `from`/`to` trae el historial completo de períodos. La tabla de
 * participación lo usa así: el reparto se liquida mes a mes y hay que poder ver
 * los meses anteriores para saber cuáles siguen pendientes de pago.
 */
export function useProfitShareQuery(from?: string, to?: string) {
  const useQuery = (
    options?: UseAPIQueryOptions,
  ): UseAPIQueryResult<{ data: ProfitShareMonthlyReport[] }> => {
    return useApiQuery({
      queryKey: [PROFIT_SHARE_KEY, from ?? 'all', to ?? 'all'],
      queryFn: () => fetchProfitShareReport(from, to),
      staleTime: 1000 * 60 * 5,
      ...options,
    } as any);
  };

  return { useQuery };
}
