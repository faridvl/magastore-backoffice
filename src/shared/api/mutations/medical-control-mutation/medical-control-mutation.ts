import { MedicalControl } from '@/types/medical-controls/medical-control.types';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { useApiMutation } from '../use-api-mutation';

export function useCreateMedicalControlMutation() {
  const {
    mutate: executeCreateControl,
    isPending,
    isSuccess,
    error,
    reset,
  } = useApiMutation({
    mutationKey: ['createMedicalControl'],
    mutationFn: (payload: MedicalControl) =>
      ApiServiceClient(env.API.MEDICAL_RECORDS_URL).post('/medical-controls', payload),
  });

  return {
    executeCreateControl,
    isPending,
    isSuccess,
    error: !!error,
    reset,
  };
}
