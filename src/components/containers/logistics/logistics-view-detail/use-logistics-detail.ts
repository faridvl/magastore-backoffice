import { usePackageDetailQuery } from '@/shared/api/querys/logistics/find-one-package-query';
import { useUpdatePackageWeightMutation } from '@/shared/api/mutations/logistics/use-update-package-weight-mutation';
import { useUpdatePackageStatusMutation } from '@/shared/api/mutations/logistics/use-update-package-status-mutation';
import { useSettingsQuery } from '@/shared/api/querys/settings/use-settings-query';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { PackageStatus } from '@/types/logistics/logistics.types';

export const usePackageDetailContainer = (uuid?: string) => {
  const [isEditingFinancial, setIsEditingFinancial] = useState(false);
  const [statusPanel, setStatusPanel] = useState({
    isOpen: false,
    nuevoEstado: '' as PackageStatus | '',
    nota: '',
    ubicacion: '',
  });

  const packageQuery = usePackageDetailQuery(uuid as string);
  const { data: apiData, isLoading: isLoadingPackage, isError } = packageQuery.useQuery();

  const { data: settingsRes } = useSettingsQuery();
  const settings = settingsRes?.current;

  const { mutateAsync: saveWeight, isPending: isSavingWeight } = useUpdatePackageWeightMutation(uuid);
  const { mutateAsync: saveStatus, isPending: isSavingStatus } = useUpdatePackageStatusMutation(uuid);

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
    totalFacturado: null as number | null,
    deliveryMethod: null as string | null,
    deliveryFeeCrc: null as number | null,
    // Courier rate del paquete
    courierRateName: null as string | null,
    courierRateUsd: null as number | null,
    courierInsuranceUsd: null as number | null,
    tcBanco: null as number | null,
    // Campos reales de billing (solo cuando hay factura)
    appliedRateUsd: null as number | null,
    appliedExchange: null as number | null,
    totalWeightCharged: null as number | null,
    appliedFeeCrc: null as number | null,
    // Regla de cobro congelada en la factura — el flete mostrado debe salir de
    // aquí y no de la tarifa de lista.
    appliedBillingMode: null as string | null,
    appliedDiscountPercent: null as number | null,
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
        estadoPago:          apiData.is_paid === true ? 'PAGADO' : apiData.is_paid === false ? 'PENDIENTE' : 'SIN FACTURA',
        totalFacturado:      apiData.total_amount_crc ?? null,
        deliveryMethod:      apiData.delivery_method ?? null,
        deliveryFeeCrc:      apiData.delivery_fee_crc ?? null,
        courierRateName:     apiData.courier_rate_name ?? null,
        courierRateUsd:      apiData.courier_rate_usd != null ? Number(apiData.courier_rate_usd) : null,
        courierInsuranceUsd: apiData.courier_insurance_usd != null ? Number(apiData.courier_insurance_usd) : null,
        tcBanco:             apiData.tc_banco != null ? Number(apiData.tc_banco) : null,
        appliedRateUsd:      apiData.applied_rate_usd != null ? Number(apiData.applied_rate_usd) : null,
        appliedExchange:     apiData.applied_exchange != null ? Number(apiData.applied_exchange) : null,
        totalWeightCharged:  apiData.total_weight_charged != null ? Number(apiData.total_weight_charged) : null,
        appliedFeeCrc:       apiData.applied_fee_crc != null ? Number(apiData.applied_fee_crc) : null,
        appliedBillingMode:  apiData.applied_billing_mode ?? null,
        appliedDiscountPercent: apiData.applied_discount_percent != null ? Number(apiData.applied_discount_percent) : null,
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
    const pesoNum    = Number(data.peso) || 0;
    const tarifa     = data.courierRateUsd ?? data.tarifaXLibre;
    const tc         = data.tcBanco ?? data.tipoCambio;
    const seguro     = data.courierInsuranceUsd ?? 0;
    const fleteUSD   = pesoNum * tarifa + seguro;
    const totalPagar = Math.round(fleteUSD * tc);

    return { fleteUSD, totalPagar, tarifa, tc, seguro };
  }, [data.peso, data.tarifaXLibre, data.tipoCambio, data.courierRateUsd, data.courierInsuranceUsd, data.tcBanco]);

  const updateField = (field: string, value: any) =>
    setData((prev) => ({ ...prev, [field]: value }));

  const handleToggleStatusPanel = () => {
    setStatusPanel((prev) => ({
      isOpen: !prev.isOpen,
      nuevoEstado: prev.isOpen ? '' : (data.estadoPaquete as PackageStatus),
      nota: '',
      ubicacion: '',
    }));
  };

  const handleUpdateStatus = async () => {
    if (!statusPanel.nuevoEstado) {
      toast.error('Selecciona un estado.');
      return;
    }
    if (!statusPanel.nota.trim()) {
      toast.error('El comentario es obligatorio.');
      return;
    }
    try {
      await saveStatus({
        status: statusPanel.nuevoEstado as PackageStatus,
        note: statusPanel.nota.trim(),
        location: statusPanel.ubicacion.trim() || undefined,
      });
      toast.success('Estado actualizado correctamente.');
      setStatusPanel({ isOpen: false, nuevoEstado: '', nota: '', ubicacion: '' });
    } catch {
      toast.error('No se pudo actualizar el estado. Intenta de nuevo.');
    }
  };

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

  const tieneFactura = data.totalFacturado !== null;

  return {
    data,
    bitacora,
    calculos,
    tieneFactura,
    isLoading: !uuid || isLoadingPackage,
    isError,
    isEditingFinancial,
    isSavingWeight,
    setIsEditingFinancial,
    handleSaveFinancial,
    updateField,
    statusPanel,
    setStatusPanel,
    isSavingStatus,
    handleToggleStatusPanel,
    handleUpdateStatus,
  };
};
