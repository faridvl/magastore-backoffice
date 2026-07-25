import { useState } from 'react';
import { toast } from 'sonner';
import { useCourierRatesQuery } from '@/shared/api/querys/settings/use-courier-rates-query';
import {
  useCreateCourierRateMutation,
  useUpdateCourierRateMutation,
  useToggleCourierRateActiveMutation,
  useSetDefaultCourierRateMutation,
} from '@/shared/api/mutations/settings/use-courier-rate-mutations';
import { CourierRateInput, CourierRateWithWarehouse, PackageType } from '@/types/logistics/logistics.types';

export type CourierRateDraft = {
  name: string;
  origin: string;
  package_type: PackageType;
  rate_usd: string;
  insurance_usd: string;
  code_prefix: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  contact_phone: string;
};

const EMPTY_DRAFT: CourierRateDraft = {
  name: '',
  origin: 'USA',
  package_type: PackageType.AEREO,
  rate_usd: '',
  insurance_usd: '',
  code_prefix: '',
  address_line: '',
  city: '',
  state: '',
  postal_code: '',
  contact_phone: '',
};

const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());

function draftToInput(draft: CourierRateDraft): CourierRateInput {
  return {
    name: draft.name.trim(),
    origin: draft.origin.trim(),
    package_type: draft.package_type,
    rate_usd: Number(draft.rate_usd),
    insurance_usd: draft.insurance_usd.trim() === '' ? 0 : Number(draft.insurance_usd),
    code_prefix: draft.code_prefix.trim(),
    address_line: orNull(draft.address_line),
    city: orNull(draft.city),
    state: orNull(draft.state),
    postal_code: orNull(draft.postal_code),
    contact_phone: orNull(draft.contact_phone),
  };
}

function rateToDraft(rate: CourierRateWithWarehouse): CourierRateDraft {
  return {
    name: rate.name,
    origin: rate.origin,
    package_type: rate.package_type,
    rate_usd: String(rate.rate_usd),
    insurance_usd: String(rate.insurance_usd),
    code_prefix: rate.code_prefix ?? '',
    address_line: rate.address_line ?? '',
    city: rate.city ?? '',
    state: rate.state ?? '',
    postal_code: rate.postal_code ?? '',
    contact_phone: rate.contact_phone ?? '',
  };
}

export const useCourierRates = () => {
  const { data, isLoading } = useCourierRatesQuery();
  const { createCourierRate, isPending: isCreating } = useCreateCourierRateMutation();
  const { updateCourierRate, isPending: isUpdating } = useUpdateCourierRateMutation();
  const { toggleCourierRateActive, isPending: isToggling } = useToggleCourierRateActiveMutation();
  const { setDefaultCourierRate, isPending: isSettingDefault } = useSetDefaultCourierRateMutation();

  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CourierRateDraft>(EMPTY_DRAFT);

  const [showNewRow, setShowNewRow] = useState(false);
  const [newDraft, setNewDraft] = useState<CourierRateDraft>(EMPTY_DRAFT);

  const rates = data?.data ?? [];
  const hasActiveRate = rates.some((r) => r.is_active);

  const startEdit = (rate: CourierRateWithWarehouse) => {
    setEditingUuid(rate.uuid);
    setEditDraft(rateToDraft(rate));
  };

  const cancelEdit = () => {
    setEditingUuid(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const updateEditDraft = (field: keyof CourierRateDraft, value: string) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingUuid) return;
    try {
      await updateCourierRate({ uuid: editingUuid, ...draftToInput(editDraft) });
      toast.success('Tarifa actualizada');
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar la tarifa.');
    }
  };

  const openNewRow = () => {
    setNewDraft(EMPTY_DRAFT);
    setShowNewRow(true);
  };

  const cancelNewRow = () => {
    setShowNewRow(false);
    setNewDraft(EMPTY_DRAFT);
  };

  const updateNewDraft = (field: keyof CourierRateDraft, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveNewRow = async () => {
    try {
      await createCourierRate(draftToInput(newDraft));
      toast.success('Tarifa creada');
      cancelNewRow();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear la tarifa.');
    }
  };

  const handleToggleActive = async (rate: CourierRateWithWarehouse) => {
    try {
      await toggleCourierRateActive({ uuid: rate.uuid, isActive: !rate.is_active });
      toast.success(rate.is_active ? 'Tarifa desactivada' : 'Tarifa activada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado de la tarifa.');
    }
  };

  const handleSetDefault = async (rate: CourierRateWithWarehouse) => {
    try {
      await setDefaultCourierRate({ uuid: rate.uuid });
      toast.success(`${rate.name} es ahora el courier predeterminado`);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo marcar como predeterminado.');
    }
  };

  return {
    rates,
    isLoading,
    hasActiveRate,
    handleSetDefault,
    isSettingDefault,
    editingUuid,
    editDraft,
    startEdit,
    cancelEdit,
    updateEditDraft,
    saveEdit,
    isUpdating,
    showNewRow,
    newDraft,
    openNewRow,
    cancelNewRow,
    updateNewDraft,
    saveNewRow,
    isCreating,
    handleToggleActive,
    isToggling,
  };
};
