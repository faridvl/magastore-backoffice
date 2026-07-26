import sql from '@/lib/db';
import { WhatsAppTemplate, WhatsAppTemplateCreateInput, WhatsAppTemplateUpdateInput } from '@/types/whatsapp/whatsapp.types';

export const WhatsAppTemplatesRepository = {
  getAll: async (): Promise<WhatsAppTemplate[]> => {
    const rows = await sql`
      SELECT id, uuid, code, name, description, body, is_active, created_at, updated_at
      FROM whatsapp_templates
      ORDER BY name ASC
    `;
    return rows as WhatsAppTemplate[];
  },

  getByCode: async (code: string): Promise<WhatsAppTemplate | null> => {
    const [row] = await sql`
      SELECT id, uuid, code, name, description, body, is_active, created_at, updated_at
      FROM whatsapp_templates
      WHERE code = ${code} AND is_active = true
      LIMIT 1
    `;
    return (row as WhatsAppTemplate) ?? null;
  },

  create: async (data: WhatsAppTemplateCreateInput): Promise<WhatsAppTemplate> => {
    const [row] = await sql`
      INSERT INTO whatsapp_templates (code, name, description, body)
      VALUES (${data.code}, ${data.name}, ${data.description}, ${data.body})
      RETURNING id, uuid, code, name, description, body, is_active, created_at, updated_at
    `;
    return row as WhatsAppTemplate;
  },

  update: async (uuid: string, data: WhatsAppTemplateUpdateInput): Promise<WhatsAppTemplate> => {
    const [row] = await sql`
      UPDATE whatsapp_templates
      SET name        = ${data.name},
          description = ${data.description},
          body        = ${data.body},
          updated_at  = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, code, name, description, body, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Plantilla no encontrada.');
    return row as WhatsAppTemplate;
  },

  toggleActive: async (uuid: string, isActive: boolean): Promise<WhatsAppTemplate> => {
    const [row] = await sql`
      UPDATE whatsapp_templates SET is_active = ${isActive}, updated_at = NOW()
      WHERE uuid = ${uuid}
      RETURNING id, uuid, code, name, description, body, is_active, created_at, updated_at
    `;
    if (!row) throw new Error('Plantilla no encontrada.');
    return row as WhatsAppTemplate;
  },
};
