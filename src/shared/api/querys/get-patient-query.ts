import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { Patient } from '@/types/patients/patient';
import { useQuery } from '@tanstack/react-query';

export const FETCH_PATIENT_DETAIL_KEY = 'fetchPatientDetail';
const PATIENTS_URL = env.API.MEDICAL_RECORDS_URL;

export const PatientService = {
  fetchPatientByUuid: async (uuid: string): Promise<Patient> => {
    return await ApiServiceClient(PATIENTS_URL).get<Patient>(`/patients/${uuid}`);
  },
};

export function usePatientDetailQuery(uuid: string) {
  return useQuery({
    queryKey: [FETCH_PATIENT_DETAIL_KEY, uuid],
    queryFn: () => PatientService.fetchPatientByUuid(uuid),
    enabled: !!uuid,
    placeholderData: (previousData) => previousData,
    staleTime: 1000 * 60 * 5,
  });
}
