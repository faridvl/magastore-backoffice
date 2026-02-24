import * as Repo from '../repositories/settings.repo';

export const getSystemDashboardData = async () => {
  return await Repo.getSettingsWithHistory();
};

export const updateSystemSettings = async (newData: any, userName: string) => {
  const { current } = await Repo.getSettingsWithHistory();

  const fields = [
    { key: 'price_per_lb', label: 'Precio por Libra' },
    { key: 'exchange_rate', label: 'Tipo de Cambio' },
    { key: 'profit_per_lb', label: 'Ganancia por Libra' },
    { key: 'min_weight', label: 'Peso Mínimo' },
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
