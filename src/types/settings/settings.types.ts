export type SystemSettings = {
  price_per_lb: number;
  exchange_rate: number;
  profit_per_lb: number;
  min_weight: number;
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
