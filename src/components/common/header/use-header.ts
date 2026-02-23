import { useMemo, useState, useEffect } from 'react';
import { useSession } from '@/hooks/use-session';
import { useLogout } from '@/hooks/use-logout';

export function useHeader() {
  const { user, isLoading: sessionLoading } = useSession();
  const { handleLogout } = useLogout();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userName = useMemo(() => user?.fullName || 'Usuario', [user]);
  const userRole = useMemo(() => user?.role || 'Personal', [user]);

  const initials = useMemo(() => {
    if (!user?.fullName) return '??';
    const names = user.fullName.trim().split(/\s+/);
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return names[0][0]?.toUpperCase() || '?';
  }, [user?.fullName]);

  return {
    userName,
    userRole,
    initials,
    isLoading: !isMounted || sessionLoading,
    handleLogout,
    user,
  };
}
