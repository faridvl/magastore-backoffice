import { useState } from 'react';
import { toast } from 'sonner';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { useShipmentOrderDetailQuery } from '@/shared/api/querys/shipment-orders/use-shipment-order-detail-query';
import { SHIPMENT_ORDERS_LIST_KEY } from '@/shared/api/querys/shipment-orders/use-shipment-orders-query';
import { useApiQueryClient } from '@/shared/api/query-hooks/use-api-client-query';
import { useWhatsAppTemplateBody } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { WHATSAPP_TEMPLATE_CODES } from '@/shared/constants/whatsapp-template-vars';
import {
  notifyWhatsApp,
  buildPostDeliveryFollowUpMessage,
  buildReviewRequestMessage,
} from '@/shared/constants/whatsapp-templates';
import { FOLLOW_UP_DELAY_DAYS } from '@/shared/constants/post-delivery';
import { ConsolidationDetail } from '@/types/logistics/logistics.types';
import { businessDaysSince } from '@/shared/utils/timezone';

export const usePostDelivery = (detail: ConsolidationDetail) => {
  const [isSendingFollowUp, setIsSendingFollowUp] = useState(false);
  const [isRequestingReview, setIsRequestingReview] = useState(false);
  const detailQuery = useShipmentOrderDetailQuery(detail.uuid);
  const apiQueryClient = useApiQueryClient();
  const followUpTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.POST_DELIVERY_FOLLOW_UP);
  const reviewTemplateBody = useWhatsAppTemplateBody(WHATSAPP_TEMPLATE_CODES.REVIEW_REQUEST);

  const firstName = detail.customer_name.split(' ')[0] || detail.customer_name;
  // Días de calendario de Costa Rica: un despacho de ayer por la noche ya no es "hoy".
  const daysSinceDispatch = businessDaysSince(detail.dispatched_at);
  // Aviso suave, no bloquea: puede haber llegado antes de lo normal.
  const isFollowUpEarly = daysSinceDispatch != null && daysSinceDispatch < FOLLOW_UP_DELAY_DAYS;
  const canRequestReview = !!detail.follow_up_sent_at;

  // La fecha se estampa ANTES de abrir WhatsApp: fuera de iPad se navega en la
  // misma vista y lo que quede después no se ejecuta.
  const stampAndNotify = async (action: string, message: string) => {
    await ApiServiceClient(env.API.BASE_URL).patch('/consolidations', {
      action,
      consolidationUuid: detail.uuid,
    });
    // El listado también: el filtro "Seguimiento pendiente" cambia al estampar.
    await Promise.all([
      detailQuery.invalidate(),
      apiQueryClient.invalidateQueries({ queryKey: [SHIPMENT_ORDERS_LIST_KEY] }),
    ]);
    await notifyWhatsApp(detail.customer_phone, message);
  };

  const handleSendFollowUp = async () => {
    if (!detail.customer_phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setIsSendingFollowUp(true);
    try {
      const message = buildPostDeliveryFollowUpMessage({
        firstName,
        orderShortId: detail.uuid.slice(-8).toUpperCase(),
        templateBody: followUpTemplateBody,
      });
      await stampAndNotify('mark-follow-up-sent', message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo preparar el seguimiento.');
    } finally {
      setIsSendingFollowUp(false);
    }
  };

  const handleRequestReview = async () => {
    if (!detail.customer_phone) {
      toast.error('Este cliente no tiene teléfono registrado.');
      return;
    }
    setIsRequestingReview(true);
    try {
      const message = buildReviewRequestMessage({ firstName, templateBody: reviewTemplateBody });
      await stampAndNotify('mark-review-requested', message);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'No se pudo preparar la solicitud de reseña.');
    } finally {
      setIsRequestingReview(false);
    }
  };

  return {
    daysSinceDispatch,
    isFollowUpEarly,
    canRequestReview,
    handleSendFollowUp, isSendingFollowUp,
    handleRequestReview, isRequestingReview,
  };
};
