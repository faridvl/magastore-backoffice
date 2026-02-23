import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { User } from '@/types/auth/auth';
import { PaginatedResponse } from '@/types/otros/paginate.types';
import { useQuery } from '@tanstack/react-query';


const USERS_URL = env.API.IDENTITY_URL; 

export const UserService = {
  fetchUsers: async (
    page: number,
    limit: number,
    search?: string,
    role?: string,
  ): Promise<PaginatedResponse<User>> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      ...(search && { search }),
      ...(role && role !== 'Todos' && { role }),
    });

    const response = await ApiServiceClient(USERS_URL).get<PaginatedResponse<User>>(
      `/users?${params.toString()}`,
    );
    return response;
  },
};

export const FETCH_USERS_KEY = 'fetchUsers';

export function useUsersQuery(page: number, limit: number, search: string, role: string) {
  return useQuery({
    queryKey: [FETCH_USERS_KEY, page, limit, search, role],
    queryFn: () => UserService.fetchUsers(page, limit, search, role),
    placeholderData: (previousData) => previousData, 
  });
}