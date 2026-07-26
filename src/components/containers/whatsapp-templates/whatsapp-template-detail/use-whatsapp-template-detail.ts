import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'sonner';
import { useWhatsAppTemplatesQuery } from '@/shared/api/querys/settings/use-whatsapp-templates-query';
import { useUpdateWhatsAppTemplateMutation } from '@/shared/api/mutations/settings/use-whatsapp-template-mutations';
import { findUnknownPlaceholders, TEMPLATE_VARIABLES, TemplateVarSpec } from '@/shared/constants/whatsapp-template-vars';
import { routesPrivate } from '@/shared/navigation/routes';

export type TemplateDetailDraft = {
  name: string;
  description: string;
  body: string;
};

const EMPTY_DRAFT: TemplateDetailDraft = { name: '', description: '', body: '' };

export const useWhatsAppTemplateDetail = (uuid?: string) => {
  const router = useRouter();
  const { data, isLoading } = useWhatsAppTemplatesQuery();
  const { updateTemplate, isPending: isSaving } = useUpdateWhatsAppTemplateMutation();

  const [draft, setDraft] = useState<TemplateDetailDraft>(EMPTY_DRAFT);
  const [isDirty, setIsDirty] = useState(false);

  const template = data?.data.find((t) => t.uuid === uuid) ?? null;

  // Carga inicial del borrador cuando llega la plantilla. No se reinicia si ya
  // hay cambios sin guardar: un refetch de la query no debe pisar lo escrito.
  useEffect(() => {
    if (!template || isDirty) return;
    setDraft({
      name: template.name,
      description: template.description ?? '',
      body: template.body,
    });
  }, [template, isDirty]);

  const variables: TemplateVarSpec[] = template ? (TEMPLATE_VARIABLES[template.code] ?? []) : [];
  const unknownVars = template ? findUnknownPlaceholders(template.code, draft.body) : [];
  const canSave = isDirty && unknownVars.length > 0 === false && draft.name.trim().length > 0;

  const updateDraft = (field: keyof TemplateDetailDraft, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  /**
   * Respaldo para insertar una variable al final del mensaje. La inserción en
   * la posición del cursor la maneja el editor, que es quien conoce la selección.
   */
  const insertVariable = (key: string) => {
    setDraft((prev) => ({ ...prev, body: `${prev.body}{{${key}}}` }));
    setIsDirty(true);
  };

  const resetDraft = () => {
    if (!template) return;
    setDraft({
      name: template.name,
      description: template.description ?? '',
      body: template.body,
    });
    setIsDirty(false);
  };

  const save = async () => {
    if (!template) return;
    try {
      await updateTemplate({
        uuid: template.uuid,
        code: template.code,
        name: draft.name,
        description: draft.description.trim() || null,
        body: draft.body,
      });
      setIsDirty(false);
      toast.success('Plantilla actualizada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar la plantilla.');
    }
  };

  const handleBack = () => router.push(routesPrivate.admin.whatsappTemplates);

  return {
    template,
    isLoading,
    draft,
    variables,
    unknownVars,
    isDirty,
    canSave,
    isSaving,
    updateDraft,
    insertVariable,
    resetDraft,
    save,
    handleBack,
  };
};
