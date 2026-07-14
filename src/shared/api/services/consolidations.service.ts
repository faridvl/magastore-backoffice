import { ConsolidationsRepository } from '../repositories/consolidations.repo';
import { ConsolidationStatus, DeliveryMethod } from '@/types/logistics/logistics.types';

// ABIERTO → CERRADO ya no es una transición manual: ocurre automáticamente al
// generar el estimado (ver LogisticsRepository.generatePreBilling). Desde ABIERTO
// no hay avance manual posible.
const STATUS_TRANSITIONS: Record<ConsolidationStatus, ConsolidationStatus | null> = {
  [ConsolidationStatus.ABIERTO]: null,
  [ConsolidationStatus.CERRADO]: ConsolidationStatus.DESPACHADO,
  [ConsolidationStatus.DESPACHADO]: ConsolidationStatus.ENTREGADO,
  [ConsolidationStatus.ENTREGADO]: null,
};

export const ConsolidationsService = {
  createConsolidation: async (customerUuid: string) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');

    return ConsolidationsRepository.createConsolidation(customerUuid);
  },

  createConsolidationWithPackages: async (
    customerUuid: string,
    packageUuids: string[],
    deliveryAddressId?: string,
    deliveryMethod?: DeliveryMethod,
  ) => {
    if (!customerUuid) throw new Error('Se requiere el UUID del cliente.');
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para crear la orden de envío.');
    }

    return ConsolidationsRepository.createConsolidationWithPackages(customerUuid, packageUuids, deliveryAddressId, deliveryMethod);
  },

  listConsolidations: async (
    page: number,
    limit: number,
    search?: string,
    paymentFilter?: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    return ConsolidationsRepository.getPaginatedConsolidations(page, limit, search, paymentFilter, dateFrom, dateTo);
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

  getCustomersWithAvailablePackages: async () => {
    return ConsolidationsRepository.getCustomersWithAvailablePackages();
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
    if (consolidation.package_count <= 1) {
      throw new Error('No se puede quitar el único paquete de la orden de envío. Para vaciarla, elimina la orden completa.');
    }

    return ConsolidationsRepository.unassignPackage(packageUuid, consolidation.id);
  },

  setDeliveryAddress: async (uuid: string, addressId: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    if (!addressId) throw new Error('Se requiere el UUID de la dirección.');
    return ConsolidationsRepository.setDeliveryAddress(uuid, addressId);
  },

  setDeliveryMethod: async (uuid: string, deliveryMethod: DeliveryMethod) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    if (!deliveryMethod) throw new Error('Se requiere el método de envío.');
    return ConsolidationsRepository.setDeliveryMethod(uuid, deliveryMethod);
  },

  /**
   * Agrega paquetes sueltos del mismo cliente a una orden existente. Solo mientras
   * ABIERTO. Espejo de unassignPackage: invalida la prefactura si existía.
   */
  assignPackages: async (consolidationUuid: string, packageUuids: string[]) => {
    if (!consolidationUuid) throw new Error('Se requiere el UUID de la orden de envío.');
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para agregar.');
    }
    return ConsolidationsRepository.assignPackages(consolidationUuid, packageUuids);
  },

  markPreBillingNotified: async (consolidationUuid: string) => {
    if (!consolidationUuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.markPreBillingNotified(consolidationUuid);
  },
};
