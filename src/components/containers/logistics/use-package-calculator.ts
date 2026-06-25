import { useState, useMemo } from 'react';
import { toast } from 'sonner';
import { PackageStatus, PackageType } from '@/types/logistics/logistics.types';
import { useCreatePackageMutation } from '@/shared/api/mutations/logistics/use-add-package-mutation';
import { useCustomersQuery } from '@/shared/api/querys/customers/use-customers-query';
import { useSettingsQuery } from '@/shared/api/querys/settings/use-settings-query';

export const usePackageCalculator = () => {
  const { data: customersRes, isLoading: loadingCustomers } = useCustomersQuery();
  const { data: settingsRes, isLoading: loadingSettings } = useSettingsQuery();
  const { executeCreate, isPending: isSaving } = useCreatePackageMutation();

  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    tracking_number: '',
    customer_id: '',
    weight_lb: 0,
    package_type: PackageType.AEREO,
    status: PackageStatus.MIAMI,
    costoOperativoCRC: 0,
  });

  const settings = settingsRes?.current;

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

  // Cálculos dinámicos
  const calculations = useMemo(() => {
    const price = Number(settings?.price_per_lb || 0);
    const rate = Number(settings?.exchange_rate || 0);
    const minW = Number(settings?.min_weight || 0);

    const weight = formData.weight_lb > 0 ? Math.max(formData.weight_lb, minW) : 0;
    const cobroTotalUSD = weight * price;
    const cobroTotalCRC = cobroTotalUSD * rate;
    const ganancia = cobroTotalCRC > 0 ? cobroTotalCRC - formData.costoOperativoCRC : 0;

    return {
      cobroTotalUSD,
      cobroTotalCRC,
      ganancia,
      appliedMin: formData.weight_lb > 0 && formData.weight_lb < minW,
    };
  }, [formData, settings]);

  const handleSave = async () => {
    if (!formData.customer_id || !formData.tracking_number) {
      toast.error('Completa los campos obligatorios');
      return;
    }
    try {
      await executeCreate(formData);
      setFormData((prev) => ({ ...prev, tracking_number: '', weight_lb: 0, costoOperativoCRC: 0 }));
      setSearchTerm('');
      toast.success('Paquete registrado');
    } catch (err: any) {
      toast.error(err?.message || 'Error al registrar el paquete');
    }
  };

  return {
    formData,
    setFormData,
    calculations,
    settings,
    customers: filteredCustomers,
    selectedCustomer,
    searchTerm,
    setSearchTerm,
    isOpen,
    setIsOpen,
    handleSave,
    isSaving,
    isLoading: loadingCustomers || loadingSettings,
  };
};
