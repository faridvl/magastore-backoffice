import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { useApiMutation } from '../use-api-mutation';

//TODO(!): MOVER ESTO A UN TYPE
export type PatientApiPayload = {
  firstName: string;
  lastName: string;
  phone: string;
  birthDate: string;
  email: string;
  documentId: string;
  gender: string;
};

export function useCreatePatientMutation() {
  const {
    mutate: executeCreatePatient,
    isPending,
    isSuccess,
    error,
    reset,
  } = useApiMutation({
    mutationKey: ['createPatient'],
    mutationFn: (payload: PatientApiPayload) =>
      ApiServiceClient(env.API.MEDICAL_RECORDS_URL).post('/patients', payload),
  });

  return {
    executeCreatePatient,
    isPending,
    isSuccess,
    error: !!error,
    reset,
  };
}
