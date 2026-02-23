// src/hooks/auth/use-logout.ts
import { useRouter } from 'next/router';
import { routesPublic } from '@/shared/navigation/routes';
import { CookiesManager } from '@/shared/utils/cookies-manager';

export const useLogout = () => {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      CookiesManager.clearAll();

      localStorage.removeItem('user_name');
      await router.replace(routesPublic.login);
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
  };

  return { handleLogout };
};
