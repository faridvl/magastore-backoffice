import { ConsolidationsRepository } from '../repositories/consolidations.repo';
import { StaleOrderError } from '@/shared/api/stale-order-error';
import { DeliveryRatesRepository } from '../repositories/delivery-rates.repo';
import { DeliveryMethodsRepository } from '../repositories/delivery-methods.repo';
import { getSettings } from '../repositories/settings.repo';
import { LogisticsService } from './logistics.service';
import { resolveZone } from '@/shared/constants/costa-rica-locations';
import { ConsolidationStatus, DeliveryMethod } from '@/types/logistics/logistics.types';
import { isUuid } from '@/shared/utils/is-uuid';

// ABIERTO → CERRADO ya no es una transición manual: ocurre automáticamente al
// generar el estimado (ver LogisticsRepository.generatePreBilling). Desde ABIERTO
// no hay avance manual posible. ENTREGADO tampoco: solo lo pone finalizeOrder,
// para que el rastreo no diga "Entregado" mientras el paquete va en camino.
const STATUS_TRANSITIONS: Record<ConsolidationStatus, ConsolidationStatus | null> = {
  [ConsolidationStatus.ABIERTO]: null,
  [ConsolidationStatus.CERRADO]: ConsolidationStatus.DESPACHADO,
  [ConsolidationStatus.DESPACHADO]: null,
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
    recipientId?: string | null,
  ) => {
    if (!isUuid(customerUuid)) throw new Error('Cliente inválido.');
    if (recipientId && !isUuid(recipientId)) throw new Error('Persona inválida: no pertenece a este cliente.');
    if (deliveryAddressId && !isUuid(deliveryAddressId)) throw new Error('Dirección inválida: no pertenece a este cliente.');
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para crear la orden de envío.');
    }
    if (!packageUuids.every(isUuid)) throw new Error('Paquete inválido.');

    return ConsolidationsRepository.createConsolidationWithPackages(customerUuid, packageUuids, deliveryAddressId, deliveryMethod, recipientId);
  },

  listConsolidations: async (
    page: number,
    limit: number,
    search?: string,
    // Tres ejes independientes y combinables — ver
    // ConsolidationsRepository.getPaginatedConsolidations.
    stepFilter?: string,
    paidFilter?: string,
    notifiedFilter?: string,
    dateFrom?: string,
    dateTo?: string,
  ) => {
    return ConsolidationsRepository.getPaginatedConsolidations(
      page, limit, search, stepFilter, paidFilter, notifiedFilter, dateFrom, dateTo,
    );
  },

  getConsolidationDetail: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    const detail = await ConsolidationsRepository.getConsolidationDetail(uuid);
    if (!detail) throw new Error('Orden de envío no encontrada.');

    // Enriquecer con la tarifa de entrega vigente (cobro y costo real) para la
    // rentabilidad. Mismo criterio de zona/peso que generatePreBilling: cantón de
    // la dirección de entrega (o la default del cliente) y peso cobrado en kg.
    const method = detail.pre_billing_delivery_method ?? detail.delivery_method;
    let deliveryCost: number | null = null;
    let deliveryFeeEstimate: number | null = null;

    const methodEntity = method ? await DeliveryMethodsRepository.findByCode(method) : null;

    if (methodEntity?.is_pickup) {
      deliveryCost = 0;
      deliveryFeeEstimate = 0;
    } else if (method && detail.pre_billing_delivery_cost_crc != null) {
      // Snapshot tomado al generar el estimado — la ganancia queda congelada
      // aunque después cambien o se eliminen tarifas.
      deliveryCost = Number(detail.pre_billing_delivery_cost_crc);
    } else if (method) {
      // Fallback vivo: orden sin estimado aún, o pre-billing anterior a la
      // migración 014 / con costo "por confirmar" en aquel momento.
      const settings = await getSettings();
      const kgPerLb = Number(settings?.kg_per_lb ?? 0.453592);
      const minLb = Number(settings?.min_weight ?? 1);
      const chargedLb = Math.max(Number(detail.total_weight_lb), minLb);
      const zone = methodEntity?.requires_zone === false ? 'RESTO' : resolveZone(detail.zone_canton ?? '');
      const rate = await DeliveryRatesRepository.findMatchingRate(method, zone, chargedLb * kgPerLb);
      deliveryCost = rate?.cost_crc != null ? Number(rate.cost_crc) : null;
      deliveryFeeEstimate = rate ? Number(rate.fee_crc) : null;
    }

    return {
      ...detail,
      delivery_cost_crc: deliveryCost,
      delivery_fee_estimate_crc: deliveryFeeEstimate,
    };
  },

  updateConsolidationStatus: async (
    uuid: string,
    newStatus: ConsolidationStatus,
    // Lo que la pantalla cree que es el estado; solo sirve para detectar una pantalla vieja.
    currentStatus: ConsolidationStatus,
    // Guía del transportista al despachar. Opcional por decisión de negocio: se
    // puede despachar sin ella y registrarla después con setTrackingCode.
    trackingCode?: string | null,
  ) => {
    if (!isUuid(uuid)) throw new Error('El identificador de la orden de envío es inválido.');
    // El estado sale de la base, no del cuerpo de la petición: una pestaña vieja no decide la transición.
    const actualStatus = await ConsolidationsRepository.getStatusByUuid(uuid);
    if (!actualStatus) throw new Error('Orden de envío no encontrada.');
    if (actualStatus !== currentStatus) throw new StaleOrderError();

    // Reabrir es la única transición inversa permitida
    const isReopen = actualStatus === ConsolidationStatus.CERRADO && newStatus === ConsolidationStatus.ABIERTO;
    if (!isReopen) {
      const allowed = STATUS_TRANSITIONS[actualStatus];
      if (allowed !== newStatus) {
        throw new Error(
          'Acción inválida para el estado actual de la orden. Actualiza la pantalla e intenta de nuevo.',
        );
      }
    }
    return ConsolidationsRepository.updateConsolidationStatus(uuid, newStatus, trackingCode, actualStatus);
  },

  /** Registra o corrige la guía del transportista tras el despacho. */
  setTrackingCode: async (uuid: string, trackingCode: string | null) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.setTrackingCode(uuid, trackingCode?.trim() || null);
  },

  /**
   * Ajuste del costo real de envío (paso 4). Ver
   * ConsolidationsRepository.setActualDeliveryFee para el alcance exacto —
   * solo corrige lo cobrado al cliente, no toca la ganancia registrada.
   */
  setActualDeliveryFee: async (uuid: string, actualFeeCrc: number) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    if (actualFeeCrc == null || actualFeeCrc < 0 || Number.isNaN(actualFeeCrc)) {
      throw new Error('El costo real de envío debe ser un monto válido mayor o igual a cero.');
    }
    return ConsolidationsRepository.setActualDeliveryFee(uuid, actualFeeCrc);
  },

  /** Marca que el vuelto calculado en el paso 4 ya se le entregó al cliente. */
  markChangeReturned: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.markChangeReturned(uuid);
  },

  setRecipient: async (uuid: string, recipientId: string | null) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    if (recipientId && !isUuid(recipientId)) throw new Error('Persona inválida: no pertenece a este cliente.');
    return ConsolidationsRepository.setRecipient(uuid, recipientId);
  },

  advanceToClosing: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.advanceToClosing(uuid);
  },

  /** Avanza del paso 4 (Cierre) al 5 (Finalizada). */
  finalizeOrder: async (uuid: string) => {
    if (!uuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.finalizeOrder(uuid);
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
   * Agrega paquetes sueltos del mismo cliente a una orden existente. Permitido
   * en el paso 1 (ABIERTO, sin estimado todavía) y en el paso 2 (CERRADO, con
   * estimado ya generado) — no en el paso 3 en adelante, ver
   * ConsolidationsRepository.assignPackages.
   *
   * Si ya había un estimado (paso 2), en vez de invalidarlo se recalcula en el
   * lugar: llama a LogisticsService.generatePreBilling, que hace el UPSERT con
   * el peso ya actualizado por el repo — la orden se queda en el paso 2 en
   * lugar de volver a "sin estimado". El operador sigue teniendo que reenviar
   * el PDF/WhatsApp si ya lo había compartido; eso lo indica la UI a partir de
   * pre_billing_notified_at, no se resetea acá.
   */
  assignPackages: async (consolidationUuid: string, packageUuids: string[]) => {
    if (!consolidationUuid) throw new Error('Se requiere el UUID de la orden de envío.');
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para agregar.');
    }
    const { hadPreBilling } = await ConsolidationsRepository.assignPackages(consolidationUuid, packageUuids);
    if (hadPreBilling) {
      await LogisticsService.generatePreBilling(consolidationUuid);
    }
  },

  markPreBillingNotified: async (consolidationUuid: string) => {
    if (!consolidationUuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.markPreBillingNotified(consolidationUuid);
  },

  /** Solicitud de envío copiada al proveedor (paso 3). */
  markShipmentRequested: async (consolidationUuid: string) => {
    if (!consolidationUuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.markShipmentRequested(consolidationUuid);
  },

  /** Aviso al cliente de que su envío fue solicitado (paso 3). */
  markCustomerNotifiedShipment: async (consolidationUuid: string) => {
    if (!consolidationUuid) throw new Error('Se requiere el UUID de la orden de envío.');
    return ConsolidationsRepository.markCustomerNotifiedShipment(consolidationUuid);
  },

  /** Postventa: seguimiento enviado al cliente (orden finalizada). */
  markFollowUpSent: async (consolidationUuid: string) => {
    if (!isUuid(consolidationUuid)) throw new Error('UUID de orden de envío inválida.');
    return ConsolidationsRepository.markFollowUpSent(consolidationUuid);
  },

  /** Postventa: reseña pedida, solo después del seguimiento. */
  markReviewRequested: async (consolidationUuid: string) => {
    if (!isUuid(consolidationUuid)) throw new Error('UUID de orden de envío inválida.');
    return ConsolidationsRepository.markReviewRequested(consolidationUuid);
  },
};
