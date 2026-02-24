import sql from '@/lib/db';

const SETTINGS_ID = '00000000-0000-0000-0000-000000000000';

export const getSettings = async () => {
  const result = await sql`SELECT * FROM system_settings WHERE id = ${SETTINGS_ID} LIMIT 1`;
  return result[0];
};

export const getSettingsWithHistory = async () => {
  const [settings, history] = await Promise.all([
    sql`SELECT * FROM system_settings WHERE id = ${SETTINGS_ID} LIMIT 1`,
    sql`SELECT * FROM settings_history ORDER BY changed_at DESC LIMIT 15`,
  ]);

  return {
    current: settings[0],
    history: history,
  };
};

export const updateSettings = async (data: any) => {
  return await sql`
    UPDATE system_settings 
    SET 
      price_per_lb = ${data.price_per_lb},
      exchange_rate = ${data.exchange_rate},
      profit_per_lb = ${data.profit_per_lb},
      min_weight = ${data.min_weight},
      updated_at = NOW()
    WHERE id = ${SETTINGS_ID}
    RETURNING *
  `;
};

export const logHistory = async (
  param: string,
  oldVal: number,
  newVal: number,
  userName: string,
) => {
  return await sql`
    INSERT INTO settings_history (parameter_name, old_value, new_value, changed_by_name)
    VALUES (${param}, ${oldVal}, ${newVal}, ${userName})
  `;
};
