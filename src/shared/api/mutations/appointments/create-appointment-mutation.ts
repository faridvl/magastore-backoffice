import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { Appointment, AppointmentStatus } from '@/types/appointments/appointment';
import { MedicalSpeciality } from '@/types/medical-controls/medical-control.types';
import { useApiMutation } from '../use-api-mutation';

// TODO(!): Mover este payload al archivo de tipos de appointments
export type CreateAppointmentPayload = {
  patientUUID: string;
  typeUUID: string;
  speciality: MedicalSpeciality;
  status: AppointmentStatus;
  date: string;
  startTime: string;
  endTime: string;
  notes: string;
};

const APPOINTMENTS_URL = env.API.MEDICAL_RECORDS_URL;

export function useCreateAppointmentMutation() {
  const {
    mutate: executeCreateAppointment,
    isPending,
    isSuccess,
    error,
    reset,
  } = useApiMutation({
    mutationKey: ['createAppointment'],
    mutationFn: (payload: CreateAppointmentPayload) =>
      ApiServiceClient(APPOINTMENTS_URL).post<Appointment>('/appointments', payload),
  });

  return {
    executeCreateAppointment,
    isPending,
    isSuccess,
    error: !!error,
    reset,
  };
}
