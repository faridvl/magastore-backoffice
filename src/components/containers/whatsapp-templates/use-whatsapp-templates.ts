import { toast } from 'sonner';
import { useWhatsAppTemplatesQuery } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { useToggleWhatsAppTemplateActiveMutation } from '@/shared/api/mutations/settings/use-whatsapp-template-mutations';
import { WhatsAppTemplate } from '@/types/whatsapp/whatsapp.types';

/**
 * Estado de la lista de plantillas. La edición vive en su propia pantalla
 * (/admin/whatsapp-templates/[uuid]) para que el editor tenga espacio real
 * en iPad y móvil.
 */
export const useWhatsAppTemplates = () => {
  const { data, isLoading } = useWhatsAppTemplatesQuery();
  const { toggleTemplateActive, isPending: isToggling } = useToggleWhatsAppTemplateActiveMutation();

  const templates = data?.data ?? [];

  const handleToggleActive = async (template: WhatsAppTemplate) => {
    try {
      await toggleTemplateActive({ uuid: template.uuid, isActive: !template.is_active });
      toast.success(template.is_active ? 'Plantilla desactivada' : 'Plantilla activada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado de la plantilla.');
    }
  };

  return {
    templates,
    isLoading,
    handleToggleActive,
    isToggling,
  };
};
