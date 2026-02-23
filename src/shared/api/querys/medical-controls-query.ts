import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { PaginatedResponse } from '@/types/otros/paginate.types';
import { useQuery } from '@tanstack/react-query';
import { MedicalControl } from '@/types/medical-controls/medical-control.types';

const URL = env.API.MEDICAL_RECORDS_URL;

export interface MedicalControlResponse {
  uuid: string;
  doctorUuid: string;
  tenantUuid: string;
  createdAt: string;
  header: {
    patientUUID: string;
    appointmentUUID: string | null;
    speciality: string;
    schemaVersion: number;
  };
  clinicalData: {
    findings: Record<string, any>;
    diagnosis: string;
  };
}

export const MedicalControlService = {
  fetchHistory: async (
    patientUuid: string,
    page = 1,
    limit = 10,
  ): Promise<PaginatedResponse<MedicalControlResponse>> => {
    return await ApiServiceClient(URL).get<PaginatedResponse<MedicalControlResponse>>(
      `/medical-controls/patient/${patientUuid}?page=${page}&limit=${limit}`,
    );
  },
};

export const FETCH_CONTROLS_KEY = 'fetchMedicalControls';

export function useMedicalControlsQuery(patientUuid: string, page = 1, limit = 10) {
  return useQuery({
    queryKey: [FETCH_CONTROLS_KEY, patientUuid, page, limit],
    queryFn: () => MedicalControlService.fetchHistory(patientUuid, page, limit),
    enabled: !!patientUuid,
  });
}
