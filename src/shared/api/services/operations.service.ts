import { OperationsRepository } from '../repositories/operations.repo';
import { OperationsStats } from '@/types/dashboard/operations.types';

export const OperationsService = {
  getOperationsStats: async (): Promise<OperationsStats> => {
    try {
      return await OperationsRepository.getOperationsStats();
    } catch (error: unknown) {
      console.error('[OperationsService.getOperationsStats]:', error);
      throw new Error('Error al obtener el panel operativo.');
    }
  },
};
