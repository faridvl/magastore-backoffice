import { ConsolidationsRepository } from '../repositories/consolidations.repo';
import { ConsolidationStatus } from '@/types/logistics/logistics.types';

const STATUS_TRANSITIONS: Record<ConsolidationStatus, ConsolidationStatus | null> = {
  [ConsolidationStatus.ABIERTO]: ConsolidationStatus.CERRADO,
  [ConsolidationStatus.CERRADO]: ConsolidationStatus.DESPACHADO,
  [ConsolidationStatus.DESPACHADO]: ConsolidationStatus.ENTREGADO,
  [ConsolidationStatus.ENTREGADO]: null,
};

export const ConsolidationsService = {
  createConsolidation: async (customerUuid: string) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');
    return ConsolidationsRepository.createConsolidation(customerUuid);
  },

  listConsolidations: async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
  ) => {
    return ConsolidationsRepository.getPaginatedConsolidations(page, limit, search, status);
  },

  getConsolidationDetail: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la consolidación.');
    const detail = await ConsolidationsRepository.getConsolidationDetail(uuid);
    if (!detail) throw new Error('Consolidación no encontrada.');
    return detail;
  },

  updateConsolidationStatus: async (
    uuid: string,
    newStatus: ConsolidationStatus,
    currentStatus: ConsolidationStatus,
  ) => {
    const allowed = STATUS_TRANSITIONS[currentStatus];
    if (allowed !== newStatus) {
      throw new Error(
        `Transición inválida: ${currentStatus} → ${newStatus}. Solo se permite: ${currentStatus} → ${allowed ?? '(ninguna)'}`,
      );
    }
    return ConsolidationsRepository.updateConsolidationStatus(uuid, newStatus);
  },

  getAvailablePackages: async (customerUuid: string) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');
    return ConsolidationsRepository.getAvailablePackagesForCustomer(customerUuid);
  },
};
