import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { SettingsDashboardResponse } from '@/types/settings/settings.types';

export function useSettingsQuery() {
  return useQuery<SettingsDashboardResponse>({
    queryKey: ['systemSettings'],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/settings'),
    staleTime: 1000 * 60 * 5,
  });
}
