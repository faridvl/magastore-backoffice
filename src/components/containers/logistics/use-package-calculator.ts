import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { PackageStatus, PackageType, CourierRate } from '@/types/logistics/logistics.types';
import { useCreatePackageMutation } from '@/shared/api/mutations/logistics/use-add-package-mutation';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';
import { useSettingsQuery } from '@/shared/api/querys/settings/use-settings-query';
import { useCustomerAddressesQuery } from '@/shared/api/querys/customers/use-customer-addresses-query';
import { useCourierRatesQuery } from '@/shared/api/querys/logistics/use-courier-rates-query';
import { useNotifyPackagesAvailable } from '@/hooks/use-notify-packages-available';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';

const TC_BANCO_KEY = 'magastore_tc_banco';

export const usePackageCalculator = () => {
  const { data: customersRes, isLoading: loadingCustomers } = useCustomersQuery();
  const { data: settingsRes, isLoading: loadingSettings } = useSettingsQuery();
  const { data: courierRates, isLoading: loadingRates } = useCourierRatesQuery();
  const { executeCreate, isPending: isSaving } = useCreatePackageMutation();
  const { notify: notifyPackagesAvailable } = useNotifyPackagesAvailable();

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  // Ruta cuyo casillero le falta al cliente elegido; abre el modal de aviso.
  const [missingWarehouse, setMissingWarehouse] = useState<{ routeId: number; rateName: string } | null>(null);
  const [isAssigningCode, setIsAssigningCode] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: '',
    customer_id: '',
    address_id: '' as string | null,
    weight_lb: 0,
    courier_rate_id: '' as string | null,
    status: PackageStatus.PANAMA,
    tc_banco: 0,
    insurance_applied: true,
    store_name: '',
  });

  const settings = settingsRes?.current;

  // Pre-cargar TC banco desde localStorage
  useEffect(() => {
    const saved = localStorage.getItem(TC_BANCO_KEY);
    if (saved) {
      setFormData((prev) => ({ ...prev, tc_banco: Number(saved) }));
    }
  }, []);

  const { data: addressesRes } = useCustomerAddressesQuery(formData.customer_id || undefined);
  const customerAddresses = addressesRes?.data ?? [];

  // Auto-seleccionar dirección por defecto al cambiar de cliente
  useEffect(() => {
    if (!formData.customer_id) {
      setFormData((prev) => ({ ...prev, address_id: null }));
      return;
    }
    if (customerAddresses.length > 0) {
      const defaultAddr = customerAddresses.find((a) => a.is_default) ?? customerAddresses[0];
      setFormData((prev) => ({ ...prev, address_id: defaultAddr.id }));
    }
  }, [formData.customer_id, customerAddresses.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // Filtrado de clientes para el dropdown
  const filteredCustomers = useMemo(() => {
    const data = customersRes?.data || [];
    if (!searchTerm) return data;
    const s = searchTerm.toLowerCase();
    return data.filter(
      (c) =>
        c.first_name.toLowerCase().includes(s) ||
        c.last_name.toLowerCase().includes(s) ||
        c.customer_code.toLowerCase().includes(s),
    );
  }, [customersRes, searchTerm]);

  const selectedCustomer = customersRes?.data.find((c) => c.id === formData.customer_id);

  // Este endpoint devuelve el array plano; se normaliza una vez para que el
  // resto del hook no dependa de la forma exacta de la respuesta.
  const rates: CourierRate[] = Array.isArray(courierRates) ? courierRates : [];

  // Preseleccionar el courier marcado como predeterminado en su mantenimiento.
  // Si ninguno lo está (todos desactivados, por ejemplo), cae al primero activo.
  useEffect(() => {
    if (rates.length === 0 || formData.courier_rate_id) return;
    const defaultRate = rates.find((r) => r.is_default) ?? rates[0];
    if (defaultRate) setFormData((prev) => ({ ...prev, courier_rate_id: defaultRate.uuid }));
  }, [rates]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectedCourierRate = rates.find((r) => r.uuid === formData.courier_rate_id) ?? null;

  // Cálculos dinámicos
  const calculations = useMemo(() => {
    const price = Number(settings?.price_per_lb || 0);
    const rate = Number(settings?.exchange_rate || 0);
    const minW = Number(settings?.min_weight || 0);
    const courierRate = Number(selectedCourierRate?.rate_usd || 0);
    const courierInsurance = Number(selectedCourierRate?.insurance_usd || 0);

    const weight = formData.weight_lb > 0 ? Math.max(formData.weight_lb, minW) : 0;
    const cobroTotalUSD = weight * price;
    const cobroTotalCRC = cobroTotalUSD * rate;

    const insurance = formData.insurance_applied && formData.weight_lb >= 2 ? courierInsurance : 0;
    const courierCostUSD = formData.weight_lb > 0 && courierRate > 0 ? formData.weight_lb * courierRate + insurance : 0;
    const courierCostCRC = courierCostUSD * formData.tc_banco;
    const ganancia = cobroTotalCRC > 0 && courierCostCRC > 0 ? cobroTotalCRC - courierCostCRC : 0;

    return {
      cobroTotalUSD,
      cobroTotalCRC,
      courierCostUSD,
      courierCostCRC,
      ganancia,
      appliedMin: formData.weight_lb > 0 && formData.weight_lb < minW,
    };
  }, [formData, settings, selectedCourierRate]);

  const handleSave = async () => {
    if (!formData.customer_id || !formData.tracking_number) {
      toast.error('Selecciona un cliente e ingresa el número de tracking antes de continuar.');
      return;
    }
    if (!formData.tc_banco || formData.tc_banco <= 0) {
      toast.error('Ingresa el tipo de cambio del banco antes de continuar.');
      return;
    }
    if (!formData.courier_rate_id || calculations.courierCostUSD <= 0) {
      toast.error('Selecciona una tarifa de courier antes de continuar. Todo paquete debe registrar su costo real.');
      return;
    }
    // Persistir TC banco para el próximo paquete
    localStorage.setItem(TC_BANCO_KEY, String(formData.tc_banco));
    await submitPackage();
  };

  /**
   * Envía el paquete. Separado de handleSave para poder reintentarlo tal cual
   * después de asignarle al cliente el casillero que le faltaba.
   */
  const submitPackage = async () => {
    const notifiedCustomer = selectedCustomer;
    try {
      await executeCreate({
        tracking_number: formData.tracking_number,
        customer_id: formData.customer_id,
        weight_lb: formData.weight_lb,
        package_type: selectedCourierRate?.package_type ?? PackageType.AEREO,
        status: formData.status,
        address_id: formData.address_id || null,
        courier_cost_usd: calculations.courierCostUSD,
        tc_banco: formData.tc_banco,
        insurance_applied: formData.insurance_applied,
        courier_rate_id: selectedCourierRate?.id ?? null,
        store_name: formData.store_name.trim() || null,
      });
      setFormData((prev) => ({
        tracking_number: '',
        customer_id: '',
        address_id: null,
        weight_lb: 0,
        courier_rate_id: prev.courier_rate_id,
        status: PackageStatus.PANAMA,
        tc_banco: prev.tc_banco,
        insurance_applied: true,
        store_name: '',
      }));
      setSearchTerm('');
      setMissingWarehouse(null);
      toast.success('Paquete registrado', {
        action: notifiedCustomer
          ? {
              label: 'WhatsApp',
              onClick: () => notifyPackagesAvailable(notifiedCustomer.id, notifiedCustomer.first_name, notifiedCustomer.phone),
            }
          : undefined,
      });
    } catch (err: any) {
      // Falta de casillero: no es un error de datos, es un paso que falta —
      // se ofrece asignarlo sin perder lo que el operador ya cargó.
      if (err?.code === 'MISSING_WAREHOUSE_CODE' && err?.warehouseRouteId) {
        setMissingWarehouse({ routeId: Number(err.warehouseRouteId), rateName: err.rateName ?? '' });
        return;
      }
      // El backend manda la causa real (ej. "Ya existe un paquete registrado
      // con el tracking ...") — mostrarla en vez de un genérico que obliga a
      // adivinar qué dato está mal.
      toast.error(err?.message ?? 'No se pudo registrar el paquete. Verifica los datos e intenta de nuevo.');
    }
  };

  /** Asigna el casillero faltante y reintenta el registro. */
  const handleAssignWarehouseCode = async () => {
    if (!missingWarehouse) return;
    setIsAssigningCode(true);
    try {
      const res: any = await ApiServiceClient(env.API.BASE_URL).post('/customers/assign-warehouse-code', {
        customerId: formData.customer_id,
        warehouseRouteId: missingWarehouse.routeId,
      });
      toast.success(`Casillero asignado: ${res?.data?.code ?? ''}`);
      setMissingWarehouse(null);
      await submitPackage();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo asignar el casillero.');
    } finally {
      setIsAssigningCode(false);
    }
  };

  return {
    formData,
    setFormData,
    calculations,
    settings,
    courierRates: rates,
    selectedCourierRate,
    customers: filteredCustomers,
    selectedCustomer,
    customerAddresses,
    searchTerm,
    setSearchTerm,
    isOpen,
    setIsOpen,
    handleSave,
    isSaving,
    missingWarehouse,
    dismissMissingWarehouse: () => setMissingWarehouse(null),
    handleAssignWarehouseCode,
    isAssigningCode,
    isLoading: loadingCustomers || loadingSettings || loadingRates,
  };
};
