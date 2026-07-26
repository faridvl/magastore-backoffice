import { useSettingsMutation } from '@/shared/api/mutations/settings/use-settings-mutation';
import { useSettingsQuery } from '@/shared/api/querys/settings/use-settings-query';
import { SystemSettings } from '@/types/settings/settings.types';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

export const useSettings = () => {
  const { data, isLoading } = useSettingsQuery();
  const { executeUpdate, isPending: isSaving } = useSettingsMutation();

  const [settings, setSettings] = useState<SystemSettings>({
    price_per_lb: 0,
    exchange_rate: 0,
    min_weight: 0,
    correos_fee_crc: 0,
    tracopa_fee_crc: 0,
    courier_rate_usd: 0,
    courier_insurance_usd: 0,
    kg_per_lb: 0.453592,
    farid_share_percent: 0,
    updated_at: new Date().toISOString(),
  });

  useEffect(() => {
    if (data?.current) {
      setSettings({
        ...data.current,
        price_per_lb:          Number(data.current.price_per_lb),
        exchange_rate:         Number(data.current.exchange_rate),
        min_weight:            Number(data.current.min_weight),
        correos_fee_crc:       Number(data.current.correos_fee_crc ?? 4500),
        tracopa_fee_crc:       Number(data.current.tracopa_fee_crc ?? 3000),
        courier_rate_usd:      Number(data.current.courier_rate_usd ?? 2.30),
        courier_insurance_usd: Number(data.current.courier_insurance_usd ?? 0.50),
        kg_per_lb:             Number(data.current.kg_per_lb ?? 0.453592),
        farid_share_percent:   Number(data.current.farid_share_percent ?? 20),
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

  const handleUpdateSetting = (key: keyof SystemSettings, value: number) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSave = async () => {
    try {
      await executeUpdate(settings);
      toast.success('Configuración guardada');
    } catch (err: any) {
      toast.error('No se pudieron guardar los cambios. Intenta de nuevo.');
    }
  };

  return {
    settings,
    history: historyCleaned,
    isLoading,
    isSaving,
    priceInCRC,
    handleUpdateSetting,
    handleSave,
  };
};
