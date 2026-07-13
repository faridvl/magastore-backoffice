import * as Repo from '../repositories/settings.repo';

export const getSystemDashboardData = async () => {
  return await Repo.getSettingsWithHistory();
};

export const updateSystemSettings = async (newData: any, userName: string) => {
  const { current } = await Repo.getSettingsWithHistory();

  const fields = [
    { key: 'price_per_lb',          label: 'Precio por Libra (USD)' },
    { key: 'exchange_rate',         label: 'Tipo de Cambio' },
    { key: 'min_weight',            label: 'Peso Mínimo' },
    { key: 'correos_fee_crc',       label: 'Tarifa Correos CR' },
    { key: 'tracopa_fee_crc',       label: 'Tarifa Tracopa' },
    { key: 'courier_rate_usd',      label: 'Tarifa Courier por Libra (USD)' },
    { key: 'courier_insurance_usd', label: 'Seguro Courier (USD)' },
    { key: 'kg_per_lb',             label: 'Conversión kg por libra' },
  ];

  for (const field of fields) {
    const oldVal = Number(current[field.key]);
    const newVal = Number(newData[field.key]);

    if (oldVal !== newVal) {
      await Repo.logHistory(field.label, oldVal, newVal, userName);
    }
  }

  return await Repo.updateSettings(newData);
};
