import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { notifyWhatsApp, buildCustomerWinBackMessage } from '@/shared/constants/whatsapp-templates';
import { useWhatsAppTemplateBody } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { WHATSAPP_TEMPLATE_CODES } from '@/shared/constants/whatsapp-template-vars';

/**
 * Fidelización: invita a volver a un cliente inactivo por WhatsApp y estampa
 * customers.win_back_sent_at, que lo saca del filtro "Por invitar".
 */
export function useCustomerWinBack() {
  const queryClient = useQueryClient();
  // Por cliente, para deshabilitar solo su botón dentro del listado.
  const [invitingCustomerId, setInvitingCustomerId] = useState<string | null>(null);
  const templateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.CUSTOMER_WIN_BACK);

  const invite = async (customerId: string, firstName: string, phone: string) => {
    if (!phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setInvitingCustomerId(customerId);
    try {
      const message = buildCustomerWinBackMessage({ firstName, templateBody });
      // Se estampa ANTES de abrir WhatsApp: fuera de iPad se navega en la misma
      // vista y lo que quede después no se ejecuta.
      await ApiServiceClient(env.API.BASE_URL).patch(`/customers/${customerId}/win-back`, {});
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['customers'] }),
        queryClient.invalidateQueries({ queryKey: ['customer', customerId] }),
      ]);
      await notifyWhatsApp(phone, message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo preparar la invitación.');
    } finally {
      setInvitingCustomerId(null);
    }
  };

  return { invite, invitingCustomerId };
}
