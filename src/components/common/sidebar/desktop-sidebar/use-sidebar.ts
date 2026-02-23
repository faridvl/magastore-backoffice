import { useState, useEffect, useMemo } from 'react';
import { useSession } from '@/hooks/use-session';

export function useSidebar() {
  const { user, tenant, isLoading: sessionLoading } = useSession();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const userName = useMemo(() => user?.fullName || 'Usuario', [user]);
  const userRole = useMemo(() => user?.role || 'Personal', [user]);
  const businessName = useMemo(() => tenant?.businessName || 'Zynka', [tenant]);

  const initials = useMemo(() => {
    if (!user?.fullName) return '??';
    const names = user.fullName.trim().split(/\s+/);
    if (names.length >= 2) return `${names[0][0]}${names[1][0]}`.toUpperCase();
    return names[0][0]?.toUpperCase() || '?';
  }, [user?.fullName]);

  return {
    userName,
    userRole,
    businessName,
    initials,
    // Hydration guard + loading state
    isLoading: !isMounted || sessionLoading,
  };
}
