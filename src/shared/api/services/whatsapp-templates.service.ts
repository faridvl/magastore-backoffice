import { WhatsAppTemplatesRepository } from '../repositories/whatsapp-templates.repo';
import { WhatsAppTemplateCreateInput, WhatsAppTemplateUpdateInput } from '@/types/whatsapp/whatsapp.types';
import { findUnknownPlaceholders, TEMPLATE_VARIABLES } from '@/shared/constants/whatsapp-template-vars';

function validateBody(code: string, body: string): void {
  if (!body?.trim()) throw new Error('El contenido de la plantilla es requerido.');

  // Un placeholder fuera del set de la plantilla se enviaría vacío al cliente,
  // así que se rechaza en vez de dejar pasar un mensaje incompleto.
  const unknown = findUnknownPlaceholders(code, body);
  if (unknown.length > 0) {
    const allowed = (TEMPLATE_VARIABLES[code] ?? []).map((v) => `{{${v.key}}}`).join(', ');
    throw new Error(
      `Variables no válidas para esta plantilla: ${unknown.map((u) => `{{${u}}}`).join(', ')}. Disponibles: ${allowed || 'ninguna'}.`,
    );
  }
}

export const WhatsAppTemplatesService = {
  getAll: async () => {
    return WhatsAppTemplatesRepository.getAll();
  },

  update: async (uuid: string, data: WhatsAppTemplateUpdateInput & { code: string }) => {
    if (!uuid) throw new Error('Se requiere el UUID de la plantilla.');
    if (!data.name?.trim()) throw new Error('El nombre de la plantilla es requerido.');
    validateBody(data.code, data.body);

    return WhatsAppTemplatesRepository.update(uuid, {
      name: data.name.trim(),
      description: data.description?.trim() || null,
      body: data.body,
    });
  },

  create: async (data: WhatsAppTemplateCreateInput) => {
    if (!data.code?.trim()) throw new Error('El código de la plantilla es requerido.');
    if (!data.name?.trim()) throw new Error('El nombre de la plantilla es requerido.');
    validateBody(data.code, data.body);

    return WhatsAppTemplatesRepository.create({
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      description: data.description?.trim() || null,
      body: data.body,
    });
  },

  toggleActive: async (uuid: string, isActive: boolean) => {
    if (!uuid) throw new Error('Se requiere el UUID de la plantilla.');
    return WhatsAppTemplatesRepository.toggleActive(uuid, isActive);
  },
};
