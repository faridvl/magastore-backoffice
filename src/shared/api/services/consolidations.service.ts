import { ConsolidationsRepository } from '../repositories/consolidations.repo';
import { ConsolidationStatus } from '@/types/logistics/logistics.types';

const STATUS_TRANSITIONS: Record<ConsolidationStatus, ConsolidationStatus | null> = {
  [ConsolidationStatus.ABIERTO]: ConsolidationStatus.CERRADO,
  [ConsolidationStatus.CERRADO]: ConsolidationStatus.ENTREGADO,
  [ConsolidationStatus.ENTREGADO]: null,
};

export const ConsolidationsService = {
  createConsolidation: async (customerUuid: string) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');

    const existing = await ConsolidationsRepository.getOpenConsolidationForCustomer(customerUuid);
    if (existing) {
      throw new Error(
        `Este cliente ya tiene una consolidación abierta (#${existing.uuid.slice(-5).toUpperCase()}). Ciérrala antes de crear una nueva.`,
      );
    }

    return ConsolidationsRepository.createConsolidation(customerUuid);
  },

  listConsolidations: async (
    page: number,
    limit: number,
    search?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    return ConsolidationsRepository.getPaginatedConsolidations(page, limit, search, status, dateFrom, dateTo);
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
    // Reabrir es la única transición inversa permitida
    const isReopen = currentStatus === ConsolidationStatus.CERRADO && newStatus === ConsolidationStatus.ABIERTO;
    if (isReopen) {
      const consolidation = await ConsolidationsRepository.getConsolidationDetail(uuid);
      if (!consolidation) throw new Error('Consolidación no encontrada.');
      const existing = await ConsolidationsRepository.getOpenConsolidationForCustomer(consolidation.customer_id);
      if (existing) {
        throw new Error('Este cliente ya tiene una consolidación abierta. Ciérrala antes de reabrir esta.');
      }
    }
    if (!isReopen) {
      const allowed = STATUS_TRANSITIONS[currentStatus];
      if (allowed !== newStatus) {
        throw new Error(
          `Transición inválida: ${currentStatus} → ${newStatus}. Solo se permite: ${currentStatus} → ${allowed ?? '(ninguna)'}`,
        );
      }
    }
    return ConsolidationsRepository.updateConsolidationStatus(uuid, newStatus);
  },

  deleteConsolidation: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la consolidación.');
    return ConsolidationsRepository.deleteConsolidation(uuid);
  },

  getOpenConsolidationForCustomer: async (customerUuid: string) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');
    return ConsolidationsRepository.getOpenConsolidationForCustomer(customerUuid);
  },

  getAvailablePackages: async (customerUuid: string) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');
    return ConsolidationsRepository.getAvailablePackagesForCustomer(customerUuid);
  },
};
