import { useQuery } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { WhatsAppTemplate } from '@/types/whatsapp/whatsapp.types';

export const WHATSAPP_TEMPLATES_KEY = 'whatsapp-templates';

export function useWhatsAppTemplatesQuery() {
  return useQuery<{ data: WhatsAppTemplate[] }>({
    queryKey: [WHATSAPP_TEMPLATES_KEY],
    queryFn: () => ApiServiceClient(env.API.BASE_URL).get('/whatsapp-templates'),
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Devuelve el body de una plantilla por su code. Los hooks que arman mensajes
 * lo usan para no depender del texto hardcodeado; si aún no cargó devuelve
 * undefined y el builder cae a su constante de respaldo.
 */
export function useWhatsAppTemplateBody(code: string): string | undefined {
  const { data } = useWhatsAppTemplatesQuery();
  return data?.data.find((t) => t.code === code && t.is_active)?.body;
}
