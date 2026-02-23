import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';

export type UseAPIMutationOptions<TData = any, TError = any, TVariables = any> = UseMutationOptions<
  TData,
  TError,
  TVariables
>;

export type UseAPIMutationResult<TData = any, TError = any, TVariables = any> = UseMutationResult<
  TData,
  TError,
  TVariables
>;

export function useApiMutation<TData = any, TVariables = any, TError = Error>(
  options: UseAPIMutationOptions<TData, TError, TVariables>,
) {
  return useMutation(options);
}
