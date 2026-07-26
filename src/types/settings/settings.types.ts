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
 * Tarifas públicas expuestas al landing.
 *
 * NUNCA incluye `exchange_rate` ni `price_per_lb` en USD. El precio por libra
 * se publica ya convertido a colones (`price_per_lb_crc`): si se expusiera el
 * monto en USD junto al total en CRC, el tipo de cambio se despejaría con una
 * simple división. Todo cálculo se resuelve en el servidor.
 */
export type PublicRates = {
  price_per_lb_crc: number;
  min_weight: number;
  correos_fee_crc: number;
  tracopa_fee_crc: number;
};

export type PublicDeliveryMethod = 'CORREOS' | 'TRACOPA' | 'RETIRO';

export type PublicQuoteInput = {
  weight_lb: number;
  delivery_method: PublicDeliveryMethod;
};

/**
 * Resultado de la calculadora pública. Únicamente montos en CRC.
 */
export type PublicQuote = {
  charged_weight_lb: number;
  shipping_crc: number;
  delivery_fee_crc: number;
  total_crc: number;
};
