import {
  UseQueryResult as UseReactQueryResult,
  UseQueryOptions as UseReactQueryOptions,
  useQuery,
} from '@tanstack/react-query';
import { FetchError } from '../../errors/fetch-error';

export type UseAPIQueryOptions = Omit<UseReactQueryOptions, 'queryFn' | 'queryKey'>;

export type UseAPIQueryResult<DataType> = UseReactQueryResult<DataType, FetchError>;

export type UseAPIClientQueryHook = {
  invalidate: () => Promise<void>;
};

export type UseAPIQueryHook<ResultType> = UseAPIClientQueryHook & {
  useQuery: (options?: UseAPIQueryOptions) => UseAPIQueryResult<ResultType>;
};

export function useApiQuery<DataType>(options: UseReactQueryOptions): UseAPIQueryResult<DataType> {
  const useQueryResult = useQuery({
    ...options,
  });

  // This error type is thrown by the Axios API
  const customApiError = (useQueryResult as any).error?.response?.data || useQueryResult.error;

  return { ...useQueryResult, error: customApiError } as UseAPIQueryResult<DataType>;
}
