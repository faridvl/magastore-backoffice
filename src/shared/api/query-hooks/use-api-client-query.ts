import { useQueryClient } from '@tanstack/react-query';

export const useApiQueryClient = () => {
  const queryClient = useQueryClient();
  return queryClient;
};
