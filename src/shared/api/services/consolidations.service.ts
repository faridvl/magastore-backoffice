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

  createConsolidationWithPackages: async (customerUuid: string, packageUuids: string[]) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para crear la orden de envío.');
    }

    return ConsolidationsRepository.createConsolidationWithPackages(customerUuid, packageUuids);
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
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    const detail = await ConsolidationsRepository.getConsolidationDetail(uuid);
    if (!detail) throw new Error('Orden de envío no encontrada.');
    return detail;
  },

  updateConsolidationStatus: async (
    uuid: string,
    newStatus: ConsolidationStatus,
    currentStatus: ConsolidationStatus,
  ) => {
    // Reabrir es la única transición inversa permitida
    const isReopen = currentStatus === ConsolidationStatus.CERRADO && newStatus === ConsolidationStatus.ABIERTO;
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
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
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

  /**
   * Quita un paquete de su orden de envío. Solo permitido si la orden sigue ABIERTO
   * y no tiene factura final. Si existe una prefactura, se elimina (snapshot obsoleto
   * por el cambio de peso) — el operador debe regenerarla.
   */
  unassignPackage: async (packageUuid: string) => {
    if (!packageUuid) throw new Error('Se requiere el UUID del paquete.');

    const consolidation = await ConsolidationsRepository.getConsolidationByPackageUuid(packageUuid);
    if (!consolidation) throw new Error('El paquete no pertenece a ninguna orden de envío.');
    if (consolidation.status !== ConsolidationStatus.ABIERTO) {
      throw new Error('Solo se pueden quitar paquetes de una orden de envío en estado ABIERTO.');
    }
    if (consolidation.billing_uuid) {
      throw new Error('No se puede quitar el paquete: la orden de envío ya tiene una factura generada.');
    }

    return ConsolidationsRepository.unassignPackage(packageUuid, consolidation.id);
  },
};
