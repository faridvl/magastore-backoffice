import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';

const APPOINTMENTS_URL = env.API.MEDICAL_RECORDS_URL;

export const AppointmentService = {
  fetchAll: async (page: number, limit: number, date: string) => {
    // El endpoint espera ?page=1&limit=10&date=YYYY-MM-DD
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
      date,
    });

    return await ApiServiceClient(APPOINTMENTS_URL).get<any>(`/appointments`);
  },
};

export const FETCH_APPOINTMENTS_KEY = 'fetchAppointments';

export function useAppointmentsQuery(page: number, limit: number, date: Date) {
  const dateFormatted = format(date, 'yyyy-MM-dd');

  return useQuery({
    queryKey: [FETCH_APPOINTMENTS_KEY, page, limit, dateFormatted],
    queryFn: () => AppointmentService.fetchAll(page, limit, dateFormatted),
  });
}
