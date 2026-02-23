import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useQuery } from '@tanstack/react-query';

export interface PatientHistoryResponse {
  patient: {
    phone: string;
    email: string;
    idNumber: string;
  };
  appointments: Array<{
    id: string;
    notes: string;
    schedule: {
      date: string;
    };
  }>;
}

export const FETCH_APPOINTMENT_BY_PATIENT_KEY = 'fetchAppointmentByPatient';
const MEDICAL_RECORDS_URL = env.API.MEDICAL_RECORDS_URL;

export const AppointmentByPatientService = {
  fetchPatientByUuid: async (uuid: string): Promise<any> => {
    return await ApiServiceClient(MEDICAL_RECORDS_URL).get<any>(`/appointments/patient/${uuid}`);
  },
};

export function useAppointmentByPatientQuery(uuid: string) {
  return useQuery({
    queryKey: [FETCH_APPOINTMENT_BY_PATIENT_KEY, uuid],
    queryFn: () => AppointmentByPatientService.fetchPatientByUuid(uuid),
    enabled: !!uuid,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  });
}
