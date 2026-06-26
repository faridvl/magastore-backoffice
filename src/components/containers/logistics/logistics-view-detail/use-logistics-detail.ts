import { usePackageDetailQuery } from '@/shared/api/querys/logistics/find-one-package-query';
import { useUpdatePackageWeightMutation } from '@/shared/api/mutations/logistics/use-update-package-weight-mutation';
import { useSettingsQuery } from '@/shared/api/querys/settings/use-settings-query';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';

export const usePackageDetailContainer = (uuid?: string) => {
  const [isEditingFinancial, setIsEditingFinancial] = useState(false);

  const packageQuery = usePackageDetailQuery(uuid as string);
  const { data: apiData, isLoading: isLoadingPackage, isError } = packageQuery.useQuery();

  const { data: settingsRes, isLoading: isLoadingSettings } = useSettingsQuery();
  const settings = settingsRes?.current;

  const { mutateAsync: saveWeight, isPending: isSavingWeight } = useUpdatePackageWeightMutation(uuid);

  const [data, setData] = useState({
    tracking: 'Cargando...',
    peso: 0,
    estadoPaquete: '---',
    observaciones: '',
    cliente: '—',
    casillero: '—',
    tarifaXLibre: 6,
    tipoCambio: 480,
    costoEnvioCorreos: 4500,
    estadoPago: 'PENDIENTE',
  });

  // Sincronizar datos del paquete + cliente
  useEffect(() => {
    if (apiData) {
      setData((prev) => ({
        ...prev,
        tracking:       apiData.tracking_number || '(Sin tracking)',
        peso:           apiData.weight_lb ? parseFloat(apiData.weight_lb) : prev.peso,
        estadoPaquete:  apiData.status || prev.estadoPaquete,
        observaciones:  apiData.internal_notes || 'Sin notas internas.',
        cliente:        apiData.first_name && apiData.last_name
                          ? `${apiData.first_name} ${apiData.last_name}`
                          : prev.cliente,
        casillero:      apiData.customer_code || prev.casillero,
        estadoPago:     apiData.is_paid === true ? 'PAGADO' : apiData.is_paid === false ? 'PENDIENTE' : 'SIN FACTURA',
      }));
    }
  }, [apiData]);

  // Sincronizar tarifas desde system_settings
  useEffect(() => {
    if (settings) {
      setData((prev) => ({
        ...prev,
        tarifaXLibre:      Number(settings.price_per_lb),
        tipoCambio:        Number(settings.exchange_rate),
        costoEnvioCorreos: Number(settings.correos_fee_crc ?? 4500),
      }));
    }
  }, [settings]);

  const bitacora = useMemo(() => {
    if (!apiData?.events) return [];
    return apiData.events.map((e: any) => ({
      id: e.id,
      fecha: new Date(e.created_at).toLocaleString('es-CR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      }),
      estado:   e.status,
      nota:     e.description,
      location: e.location || 'No especificada',
    }));
  }, [apiData]);

  const calculos = useMemo(() => {
    const pesoNum  = Number(data.peso) || 0;
    const fleteUSD = pesoNum * data.tarifaXLibre;
    const totalPagar = fleteUSD * data.tipoCambio + data.costoEnvioCorreos;

    return { fleteUSD, totalPagar };
  }, [data.peso, data.tarifaXLibre, data.tipoCambio, data.costoEnvioCorreos]);

  const updateField = (field: string, value: any) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleSaveFinancial = async () => {
    const weight = Number(data.peso);
    if (!weight || weight <= 0) {
      toast.error('Ingresa un peso válido mayor a 0 libras.');
      return;
    }
    try {
      await saveWeight({ weight_lb: weight });
      toast.success('Peso actualizado correctamente.');
      setIsEditingFinancial(false);
    } catch (err: any) {
      toast.error('No se pudo actualizar el peso. Intenta de nuevo.');
    }
  };

  return {
    data,
    bitacora,
    calculos,
    isLoading: !uuid || isLoadingPackage || isLoadingSettings,
    isError,
    isEditingFinancial,
    isSavingWeight,
    setIsEditingFinancial,
    handleSaveFinancial,
    updateField,
  };
};
