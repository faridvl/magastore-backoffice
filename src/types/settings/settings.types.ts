export type SystemSettings = {
  price_per_lb: number;
  exchange_rate: number;
  min_weight: number;
  correos_fee_crc: number;
  tracopa_fee_crc: number;
  courier_rate_usd: number;
  courier_insurance_usd: number;
  kg_per_lb: number;
  // Participación de Farid sobre la ganancia. Solo lectura: no viaja en el
  // UPDATE de settings.repo.ts — se cambia directamente en la BD a propósito.
  farid_share_percent: number;
  updated_at: string;
};

export type SettingsHistory = {
  id: string;
  parameter_name: string;
  old_value: number;
  new_value: number;
  changed_at: string;
  changed_by_name: string;
};

export type SettingsDashboardResponse = {
  current: SystemSettings;
  history: SettingsHistory[];
};

/**
 * Tarifas públicas expuestas al landing. Todo se publica en USD.
 *
 * NUNCA incluye `exchange_rate`. Al mostrar únicamente dólares no queda ningún
 * par USD/CRC del que se pueda despejar el tipo de cambio: las tarifas de
 * entrega, que en BD viven en colones, se convierten en el servidor.
 */
export type PublicRates = {
  price_per_lb_usd: number;
  min_weight: number;
  correos_fee_usd: number;
};

/**
 * Métodos ofrecidos en el landing. `TRACOPA` existe en el sistema pero no se
 * publica: de cara al cliente solo hay retiro o envío por Correos.
 */
export type PublicDeliveryMethod = 'CORREOS' | 'RETIRO';

export type PublicQuoteInput = {
  weight_lb: number;
  delivery_method: PublicDeliveryMethod;
};

/**
 * Resultado de la calculadora pública. Únicamente montos en USD.
 */
export type PublicQuote = {
  charged_weight_lb: number;
  shipping_usd: number;
  delivery_fee_usd: number;
  total_usd: number;
};
