import { useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { useApiMutation } from '../use-api-mutation';
import { env } from '../../config';
import { WhatsAppTemplate, WhatsAppTemplateUpdateInput } from '@/types/whatsapp/whatsapp.types';
import { WHATSAPP_TEMPLATES_KEY } from '../../querys/settings/use-whatsapp-templates-query';

export function useUpdateWhatsAppTemplateMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: updateTemplate, isPending, error, reset } = useApiMutation<
    { data: WhatsAppTemplate },
    { uuid: string; code: string } & WhatsAppTemplateUpdateInput,
    Error
  >({
    mutationKey: ['updateWhatsAppTemplate'],
    mutationFn: ({ uuid, ...data }) => ApiServiceClient(env.API.BASE_URL).patch('/whatsapp-templates', { uuid, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WHATSAPP_TEMPLATES_KEY] });
    },
  });
  return { updateTemplate, isPending, error, reset };
}

export function useToggleWhatsAppTemplateActiveMutation() {
  const queryClient = useQueryClient();
  const { mutateAsync: toggleTemplateActive, isPending, error, reset } = useApiMutation<
    { data: WhatsAppTemplate },
    { uuid: string; isActive: boolean },
    Error
  >({
    mutationKey: ['toggleWhatsAppTemplateActive'],
    mutationFn: ({ uuid, isActive }) => ApiServiceClient(env.API.BASE_URL).patch('/whatsapp-templates', { uuid, action: 'toggle-active', isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [WHATSAPP_TEMPLATES_KEY] });
    },
  });
  return { toggleTemplateActive, isPending, error, reset };
}
