import { LogisticsRepository } from '../repositories/logistics.repo';
import {
  PackageStatus,
  PackageInput,
  Package,
  Consolidation,
  Billing,
  CourierRate,
  PreBilling,
  DeliveryMethod,
} from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';
import { sendDeliveryNotification, sendInvoiceNotification } from '@/lib/email';

/**
 * Servicio encargado de la lógica de negocio para el sistema de couriers.
 * Actúa como puente entre los controladores de la API y el repositorio.
 */
export const LogisticsService = {
  /**
   * Obtiene todos los paquetes con paginación para la tabla administrativa.
   */
  getAllPackages: async (
    page: number = 1,
    limit: number = 10,
    search?: string,
    status?: string,
    dateFrom?: string,
    dateTo?: string,
    consolidationFilter?: string,
    customerUuid?: string,
  ): Promise<PaginatedResponse<Package>> => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    try {
      const { data, total } = await LogisticsRepository.getPaginatedPackages(
        safePage,
        safeLimit,
        search,
        status,
        dateFrom,
        dateTo,
        consolidationFilter,
        customerUuid,
      );

      const totalPages = Math.ceil(total / safeLimit);

      return {
        data: data as Package[],
        meta: {
          total,
          page: safePage,
          limit: safeLimit,
          totalPages,
        },
      };
    } catch (error: any) {
      console.error('[LogisticsService.getAllPackages]:', error);
      throw new Error('Error al obtener el listado de paquetes filtrado.');
    }
  },

  /**
   * Obtiene un paquete específico por su UUID (Ficha Completa).
   */
  getPackageByUuid: async (uuid: string): Promise<Package> => {
    if (!uuid) throw new Error('El UUID del paquete es requerido.');

    const pkg = await LogisticsRepository.getTrackingHistory(uuid);

    if (!pkg) {
      throw new Error(`No se encontró el paquete con UUID: ${uuid}`);
    }

    return pkg;
  },

  /**
   * Registra un nuevo paquete (Entrada a Bodega).
   */
  registerIncomingPackage: async (data: PackageInput): Promise<Partial<Package>> => {
    if (data.weight_lb <= 0) {
      throw new Error('El peso del paquete debe ser mayor a 0.');
    }
    if (!data.tracking_number?.trim()) {
      throw new Error('El número de tracking es requerido.');
    }

    const exists = await LogisticsRepository.existsByTrackingNumber(data.tracking_number.trim());
    if (exists) {
      throw new Error(`Ya existe un paquete registrado con el tracking ${data.tracking_number.trim()}.`);
    }

    try {
      return await LogisticsRepository.createPackage(data);
    } catch (error: any) {
      console.error('[LogisticsService.registerIncomingPackage] data:', JSON.stringify(data));
      console.error('[LogisticsService.registerIncomingPackage] error:', error?.message ?? error);
      if (error?.code === '23505') {
        throw new Error(`Ya existe un paquete registrado con el tracking ${data.tracking_number.trim()}.`);
      }
      throw new Error('No se pudo registrar el paquete. Verifique los datos.');
    }
  },

  /**
   * Obtiene el historial completo de un paquete para la vista de tracking.
   */
  getPackageTracking: async (uuid: string): Promise<any> => {
    if (!uuid) throw new Error('El UUID del paquete es requerido.');

    const packageData = await LogisticsRepository.getTrackingHistory(uuid);

    if (!packageData) {
      throw new Error('No se encontró ningún paquete con el identificador proporcionado.');
    }

    return packageData;
  },

  /**
   * Búsqueda pública por tracking_number. Usada en /tracking sin autenticación.
   */
  getPackageByTrackingNumber: async (trackingNumber: string): Promise<any> => {
    const clean = trackingNumber?.trim();
    if (!clean) throw new Error('El número de tracking es requerido.');

    const packageData = await LogisticsRepository.getTrackingByNumber(clean);

    if (!packageData) {
      throw new Error('No se encontró ningún paquete con ese número de tracking.');
    }

    return packageData;
  },

  /**
   * Búsqueda admin completa por tracking_number (incluye billing). Usada en /admin/packages.
   */
  lookupPackageByTracking: async (trackingNumber: string): Promise<any> => {
    const clean = trackingNumber?.trim();
    if (!clean) throw new Error('El número de tracking es requerido.');

    const packageData = await LogisticsRepository.getPackageDetailByTracking(clean);

    if (!packageData) {
      throw new Error('No se encontró ningún paquete con ese número de tracking.');
    }

    return packageData;
  },

  /**
   * Actualiza el peso registrado de un paquete.
   */
  updatePackageWeight: async (
    uuid: string,
    weight_lb: number,
  ): Promise<Partial<Package>> => {
    if (!weight_lb || weight_lb <= 0) {
      throw new Error('El peso del paquete debe ser mayor a 0.');
    }
    try {
      return await LogisticsRepository.updatePackageWeight(uuid, weight_lb);
    } catch (error: any) {
      console.error('[LogisticsService.updatePackageWeight]:', error);
      throw new Error(error.message || 'Error al actualizar el peso.');
    }
  },

  /**
   * Agrupa varios paquetes en un solo consolidado y recalcula pesos.
   */
  processConsolidation: async (
    consolidationUuid: string,
    packageUuids: string[],
  ): Promise<Partial<Consolidation>> => {
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para consolidar.');
    }

    const mismatched = await LogisticsRepository.countMismatchedPackages(consolidationUuid, packageUuids);
    if (mismatched > 0) {
      throw new Error(
        `${mismatched} paquete(s) no pertenecen al cliente de esta orden de envío.`,
      );
    }

    try {
      return await LogisticsRepository.consolidatePackages(consolidationUuid, packageUuids);
    } catch (error: any) {
      console.error('[LogisticsService.processConsolidation]:', error);
      throw new Error(error.message || 'Error al procesar la orden de envío.');
    }
  },

  /**
   * Genera la factura para una orden de envío (snapshot de tarifas + envío local).
   */
  createInvoice: async (
    consolidationUuid: string,
    deliveryMethod: DeliveryMethod,
  ): Promise<Partial<Billing>> => {
    try {
      const billing = await LogisticsRepository.generateBilling(consolidationUuid, deliveryMethod);

      const customerInfo = await LogisticsRepository.getConsolidationCustomerInfo(consolidationUuid);
      if (customerInfo && billing.uuid && billing.total_amount_crc) {
        sendInvoiceNotification({
          to: customerInfo.email,
          firstName: customerInfo.first_name,
          totalAmountCRC: Number(billing.total_amount_crc),
          billingUuid: billing.uuid as string,
        }).catch((err) =>
          console.error('[Email] Error enviando notificación de factura:', err),
        );
      }

      return billing;
    } catch (error: any) {
      console.error('[LogisticsService.createInvoice]:', error);
      throw new Error(error.message || 'Error al generar la facturación.');
    }
  },

  /**
   * Actualiza el estado de un paquete e inserta eventos en la bitácora.
   */
  getCourierRates: async (): Promise<CourierRate[]> => {
    return await LogisticsRepository.getCourierRates();
  },

  generatePreBilling: async (
    consolidationUuid: string,
    deliveryMethod: DeliveryMethod,
  ): Promise<Partial<PreBilling>> => {
    try {
      return await LogisticsRepository.generatePreBilling(consolidationUuid, deliveryMethod);
    } catch (error: any) {
      console.error('[LogisticsService.generatePreBilling]:', error);
      throw new Error(error.message || 'Error al generar la prefactura.');
    }
  },

  confirmPreBilling: async (consolidationUuid: string): Promise<{ billing_uuid: string }> => {
    try {
      const result = await LogisticsRepository.confirmPreBilling(consolidationUuid);
      const customerInfo = await LogisticsRepository.getConsolidationCustomerInfo(consolidationUuid);
      if (customerInfo) {
        const [billing] = await Promise.resolve([result]);
        if (billing?.billing_uuid) {
          const { sendInvoiceNotification } = await import('@/lib/email');
          sendInvoiceNotification({
            to: customerInfo.email,
            firstName: customerInfo.first_name,
            totalAmountCRC: 0,
            billingUuid: billing.billing_uuid,
          }).catch((err) => console.error('[Email] Error enviando notificación de factura:', err));
        }
      }
      return result;
    } catch (error: any) {
      console.error('[LogisticsService.confirmPreBilling]:', error);
      throw new Error(error.message || 'Error al confirmar la prefactura.');
    }
  },

  bulkUpdateStatus: async (
    packageUuids: string[],
    status: PackageStatus,
  ): Promise<number> => {
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete.');
    }
    try {
      return await LogisticsRepository.bulkUpdateStatus(packageUuids, status);
    } catch (error: any) {
      console.error('[LogisticsService.bulkUpdateStatus]:', error);
      throw new Error(error.message || 'Error al actualizar estados.');
    }
  },

  updateStatus: async (
    uuid: string,
    status: PackageStatus,
    note?: string,
    evidenceUrl?: string,
    location?: string,
  ): Promise<Partial<Package>> => {
    try {
      const updatedPackage = await LogisticsRepository.updatePackageStatus(
        uuid,
        status,
        note,
        evidenceUrl,
        location,
      );

      if (status === PackageStatus.ENTREGADO) {
        const customerInfo = await LogisticsRepository.getPackageCustomerInfo(uuid);
        if (customerInfo) {
          sendDeliveryNotification({
            to: customerInfo.email,
            firstName: customerInfo.first_name,
            trackingNumber: customerInfo.tracking_number,
          }).catch((err) =>
            console.error('[Email] Error enviando notificación de entrega:', err),
          );
        }
      }

      return updatedPackage;
    } catch (error: any) {
      console.error('[LogisticsService.updateStatus]:', error);
      throw new Error(error.message || 'Error al actualizar el estado.');
    }
  },
};
