import { useSettingsMutation } from '@/shared/api/mutations/settings/use-settings-mutation';
import { useSettingsQuery } from '@/shared/api/querys/settings/use-settings-query';
import { SystemSettings } from '@/types/settings/settings.types';
import { useState, useEffect } from 'react';

export const useSettings = () => {
  const { data, isLoading } = useSettingsQuery();
  const { executeUpdate, isPending: isSaving } = useSettingsMutation();

  const [settings, setSettings] = useState<SystemSettings>({
    price_per_lb: 0,
    exchange_rate: 0,
    profit_per_lb: 0,
    min_weight: 0,
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    if (data?.current) {
      setSettings({
        ...data.current,
        price_per_lb: Number(data.current.price_per_lb),
        exchange_rate: Number(data.current.exchange_rate),
        profit_per_lb: Number(data.current.profit_per_lb),
        min_weight: Number(data.current.min_weight),
      });
    }
  }, [data]);

  // Procesamos el historial con una limpieza manual por si acaso
  const historyCleaned = (data?.history || []).map((item: any) => {
    let userName = item.changed_by_name || 'Sistema';

    // Si trae %20, lo reemplazamos por espacio real
    if (userName.includes('%20')) {
      userName = userName.replace(/%20/g, ' ');
    }

    // Por si acaso viene con otros caracteres codificados
    try {
      userName = decodeURIComponent(userName);
    } catch (e) {
      // Si falla, nos quedamos con el replace manual
    }

    return {
      ...item,
      changed_by_name: userName,
    };
  });

  const priceInCRC = settings.price_per_lb * settings.exchange_rate;

  const profitMargin =
    priceInCRC > 0 ? ((settings.profit_per_lb / priceInCRC) * 100).toFixed(1) : '0.0';

  const handleUpdateSetting = (key: keyof SystemSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = () => {
    executeUpdate(settings);
  };

  return {
    settings,
    // IMPORTANTE: Asegúrate de que el componente use esta variable "historyCleaned"
    history: historyCleaned,
    isLoading,
    isSaving,
    priceInCRC,
    profitMargin,
    handleUpdateSetting,
    handleSave,
  };
};
