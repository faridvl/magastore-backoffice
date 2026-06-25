import { useState, useEffect } from 'react';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { UserRole } from '@/types/auth/auth';

export function useSidebar() {
  const [isMounted, setIsMounted] = useState(false);
  const [userName, setUserName] = useState('Usuario');
  const [userRole, setUserRole] = useState<string>(UserRole.ADMIN);

  useEffect(() => {
    setIsMounted(true);
    setUserName(CookiesManager.getUserName() || 'Usuario');
    setUserRole(CookiesManager.getUserRole() || UserRole.ADMIN);
  }, []);

  const isAdmin = userRole === UserRole.ADMIN;

  return {
    userName,
    userRole,
    isAdmin,
    isLoading: !isMounted,
  };
}
