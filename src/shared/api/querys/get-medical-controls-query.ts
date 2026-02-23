import { MedicalControlResponse } from './medical-controls-query';
import { ApiServiceClient } from '../api-service-client';
import { useQuery } from '@tanstack/react-query';
import { env } from '../config';

export const ControlDetailService = {
  getById: async (uuid: string): Promise<MedicalControlResponse> => {
    return await ApiServiceClient(env.API.MEDICAL_RECORDS_URL).get<MedicalControlResponse>(
      `/medical-controls/${uuid}`,
    );
  },
};

export function useControlDetailQuery(controlId: string) {
  return useQuery({
    queryKey: ['controlDetail', controlId],
    queryFn: () => ControlDetailService.getById(controlId),
    enabled: !!controlId,
  });
}
