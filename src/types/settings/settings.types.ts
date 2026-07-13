export type SystemSettings = {
  price_per_lb: number;
  exchange_rate: number;
  min_weight: number;
  correos_fee_crc: number;
  tracopa_fee_crc: number;
  courier_rate_usd: number;
  courier_insurance_usd: number;
  kg_per_lb: number;
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
