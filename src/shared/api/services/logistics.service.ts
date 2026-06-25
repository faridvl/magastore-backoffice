import { LogisticsRepository } from '../repositories/logistics.repo';
import {
  PackageStatus,
  PackageInput,
  Package,
  Consolidation,
  Billing,
  DeliveryMethod,
} from '@/types/logistics/logistics.types';
import { PaginatedResponse } from '@/types/paginate.types';

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
  ): Promise<PaginatedResponse<Package>> => {
    const safePage = Math.max(1, page);
    const safeLimit = Math.max(1, limit);

    try {
      // Pasamos search y status al repo
      const { data, total } = await LogisticsRepository.getPaginatedPackages(
        safePage,
        safeLimit,
        search,
        status,
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

    try {
      return await LogisticsRepository.createPackage(data);
    } catch (error: any) {
      console.error('[LogisticsService.registerIncomingPackage]:', error);
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
   * Agrupa varios paquetes en un solo consolidado y recalcula pesos.
   */
  processConsolidation: async (
    consolidationUuid: string,
    packageUuids: string[],
  ): Promise<Partial<Consolidation>> => {
    if (!packageUuids || packageUuids.length === 0) {
      throw new Error('Debe seleccionar al menos un paquete para consolidar.');
    }

    try {
      return await LogisticsRepository.consolidatePackages(consolidationUuid, packageUuids);
    } catch (error: any) {
      console.error('[LogisticsService.processConsolidation]:', error);
      throw new Error(error.message || 'Error al procesar la consolidación.');
    }
  },

  /**
   * Genera la factura para una consolidación (snapshot de tarifas + envío local).
   */
  createInvoice: async (
    consolidationUuid: string,
    deliveryMethod: DeliveryMethod,
  ): Promise<Partial<Billing>> => {
    try {
      return await LogisticsRepository.generateBilling(consolidationUuid, deliveryMethod);
    } catch (error: any) {
      console.error('[LogisticsService.createInvoice]:', error);
      throw new Error(error.message || 'Error al generar la facturación.');
    }
  },

  /**
   * Actualiza el estado de un paquete e inserta eventos en la bitácora.
   */
  updateStatus: async (
    uuid: string,
    status: PackageStatus,
    note?: string,
    evidenceUrl?: string,
  ): Promise<Partial<Package>> => {
    try {
      const updatedPackage = await LogisticsRepository.updatePackageStatus(
        uuid,
        status,
        note,
        evidenceUrl,
      );

      // Webhook o Notificación ficticia
      if (status === PackageStatus.ENTREGADO) {
        console.log(`[Email Notification]: El paquete ${uuid} ha sido entregado.`);
      }

      return updatedPackage;
    } catch (error: any) {
      console.error('[LogisticsService.updateStatus]:', error);
      throw new Error(error.message || 'Error al actualizar el estado.');
    }
  },
};
