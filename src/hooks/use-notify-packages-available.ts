import { useState } from 'react';
import { toast } from 'sonner';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { openWhatsApp, buildPackagesAvailableMessage } from '@/shared/constants/whatsapp-templates';
import { useWhatsAppTemplateBody } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { WHATSAPP_TEMPLATE_CODES } from '@/shared/constants/whatsapp-template-vars';
import { AvailablePackage } from '@/types/logistics/logistics.types';

/**
 * Notifica a un cliente por WhatsApp de sus paquetes sin orden de envío (plantilla 1).
 * Siempre lista TODOS los paquetes disponibles del cliente, no solo un subconjunto —
 * regla acordada para que el cliente vea el panorama completo antes de decidir.
 */
export function useNotifyPackagesAvailable() {
  const [isNotifying, setIsNotifying] = useState(false);
  const templateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.PACKAGES_AVAILABLE);

  const notify = async (customerId: string, firstName: string, phone: string) => {
    if (!phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setIsNotifying(true);
    try {
      const { data: packages } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: AvailablePackage[] }>(`/consolidations?availablePackages=${customerId}`);

      if (packages.length === 0) {
        toast.error('Este cliente no tiene paquetes disponibles sin orden de envío.');
        return;
      }

      const message = buildPackagesAvailableMessage({
        firstName,
        packages: packages.map((p: AvailablePackage) => ({
          storeName: p.store_name,
          trackingNumber: p.tracking_number,
          weightLb: Number(p.weight_lb),
        })),
        templateBody,
      });

      // La bitácora se registra ANTES de abrir WhatsApp: en iPad openWhatsApp
      // navega en la misma vista, y todo lo que quede pendiente después de esa
      // línea nunca llega a ejecutarse.
      await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=log-notified', {
        packageUuids: packages.map((p: AvailablePackage) => p.uuid),
      });

      openWhatsApp(phone, message);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo preparar la notificación de WhatsApp.');
    } finally {
      setIsNotifying(false);
    }
  };

  return { notify, isNotifying };
}
