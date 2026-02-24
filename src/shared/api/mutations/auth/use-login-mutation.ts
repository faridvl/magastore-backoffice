import { LoginCredentials, LoginResponse } from '@/types/auth/auth';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { useRouter } from 'next/router';

export function useLoginMutation() {
  const router = useRouter();

  const {
    mutate: executeLogin,
    isPending,
    error,
    reset,
  } = useApiMutation<LoginResponse, LoginCredentials>({
    mutationKey: ['loginUser'],
    mutationFn: (credentials) =>
      ApiServiceClient(env.API.BASE_URL).post('/auth/login', credentials),
    onSuccess: (response) => {
      CookiesManager.setSession(response.access_token, response.user.name, response.user.role);

      router.push('/');
    },
  });

  return { executeLogin, isPending, error, reset };
}
