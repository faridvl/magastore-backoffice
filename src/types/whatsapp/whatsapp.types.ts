export interface WhatsAppTemplate {
  id: number;
  uuid: string;
  /** Identificador estable que usan los builders. No editable desde la UI. */
  code: string;
  name: string;
  description: string | null;
  body: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppTemplateUpdateInput {
  name: string;
  description: string | null;
  body: string;
}

export interface WhatsAppTemplateCreateInput extends WhatsAppTemplateUpdateInput {
  code: string;
}
