import { DashboardRepository } from '../repositories/dashboard.repo';
import { DashboardStats } from '@/types/dashboard/dashboard.types';

export const DashboardService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    try {
      return await DashboardRepository.getDashboardStats();
    } catch (error: unknown) {
      console.error('[DashboardService.getDashboardStats]:', error);
      throw new Error('Error al obtener estadísticas del dashboard.');
    }
  },
};
