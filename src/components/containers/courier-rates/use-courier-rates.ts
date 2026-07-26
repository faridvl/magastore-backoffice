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
import {
  applyUpperMask,
  applyCodePrefixMask,
  applyUsPhoneMask,
  loadUsPhone,
  applyZipMask,
  applyMoneyMask,
} from '@/shared/utils/courier-rate-masks';
import { validateCourierRateDraft, CourierRateFormErrors } from '@/shared/utils/courier-rate-schema';

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

/**
 * Máscara por campo. El teléfono usa el formato de EE. UU. y no el de
 * `customer-masks`: los casilleros están en Florida, y la máscara de Costa Rica
 * (+506, 8 dígitos) destruiría un número real como "+1 786-360-2816".
 */
const FIELD_MASKS: Partial<Record<keyof CourierRateDraft, (value: string) => string>> = {
  name: applyUpperMask,
  origin: applyUpperMask,
  code_prefix: applyCodePrefixMask,
  address_line: applyUpperMask,
  city: applyUpperMask,
  state: applyUpperMask,
  postal_code: applyZipMask,
  contact_phone: applyUsPhoneMask,
  rate_usd: applyMoneyMask,
  insurance_usd: applyMoneyMask,
};

function maskField(field: keyof CourierRateDraft, value: string): string {
  const mask = FIELD_MASKS[field];
  return mask ? mask(value) : value;
}

/**
 * Los campos de texto se envían en mayúsculas. La máscara ya lo hace mientras se
 * escribe, pero se repite aquí porque un draft puede venir de `rateToDraft` con
 * datos viejos guardados en minúscula: editar y guardar un courier existente
 * debe normalizarlo, no re-guardar el formato antiguo.
 */
function draftToInput(draft: CourierRateDraft): CourierRateInput {
  return {
    name: applyUpperMask(draft.name).trim(),
    origin: applyUpperMask(draft.origin).trim(),
    package_type: draft.package_type,
    rate_usd: Number(draft.rate_usd),
    insurance_usd: draft.insurance_usd.trim() === '' ? 0 : Number(draft.insurance_usd),
    code_prefix: applyCodePrefixMask(draft.code_prefix).trim(),
    address_line: applyUpperMask(draft.address_line).trim(),
    city: applyUpperMask(draft.city).trim(),
    state: applyUpperMask(draft.state).trim(),
    postal_code: draft.postal_code.trim(),
    contact_phone: draft.contact_phone.trim(),
  };
}

/**
 * Carga la tarifa en el formulario aplicando las mismas máscaras que el tipeo.
 * Un courier guardado antes de este cambio puede traer la ciudad en minúscula o
 * el teléfono sin formato: se muestra ya normalizado para que el operador vea
 * exactamente lo que se va a guardar.
 */
function rateToDraft(rate: CourierRateWithWarehouse): CourierRateDraft {
  return {
    name: applyUpperMask(rate.name),
    origin: applyUpperMask(rate.origin),
    package_type: rate.package_type,
    // Los montos llegan de Postgres como "2.3000" — se recortan los ceros de
    // relleno para que el input no muestre 4 decimales.
    rate_usd: String(Number(rate.rate_usd)),
    insurance_usd: String(Number(rate.insurance_usd)),
    code_prefix: applyCodePrefixMask(rate.code_prefix ?? ''),
    address_line: applyUpperMask(rate.address_line ?? ''),
    city: applyUpperMask(rate.city ?? ''),
    state: applyUpperMask(rate.state ?? ''),
    postal_code: applyZipMask(rate.postal_code ?? ''),
    // Se carga sin reinterpretar: un teléfono guardado que no sea un número US
    // válido debe verse tal cual y fallar la validación, no salir "arreglado"
    // con dígitos reagrupados que nadie escribió.
    contact_phone: loadUsPhone(rate.contact_phone ?? ''),
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
  const [editErrors, setEditErrors] = useState<CourierRateFormErrors>({});

  const [showNewRow, setShowNewRow] = useState(false);
  const [newDraft, setNewDraft] = useState<CourierRateDraft>(EMPTY_DRAFT);
  const [newErrors, setNewErrors] = useState<CourierRateFormErrors>({});

  const rates = data?.data ?? [];
  const hasActiveRate = rates.some((r) => r.is_active);

  const startEdit = (rate: CourierRateWithWarehouse) => {
    setEditingUuid(rate.uuid);
    setEditDraft(rateToDraft(rate));
    setEditErrors({});
  };

  const cancelEdit = () => {
    setEditingUuid(null);
    setEditDraft(EMPTY_DRAFT);
    setEditErrors({});
  };

  const updateEditDraft = (field: keyof CourierRateDraft, value: string) => {
    setEditDraft((prev) => ({ ...prev, [field]: maskField(field, value) }));
    // El error del campo se limpia al corregirlo, sin esperar al próximo
    // guardado: mantener el mensaje mientras se escribe la corrección hace
    // parecer que el campo sigue mal.
    setEditErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const saveEdit = async () => {
    if (!editingUuid) return;
    const errors = await validateCourierRateDraft(editDraft);
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      toast.error('Revisa los campos marcados.');
      return;
    }
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
    setNewErrors({});
    setShowNewRow(true);
  };

  const cancelNewRow = () => {
    setShowNewRow(false);
    setNewDraft(EMPTY_DRAFT);
    setNewErrors({});
  };

  const updateNewDraft = (field: keyof CourierRateDraft, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: maskField(field, value) }));
    setNewErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev));
  };

  const saveNewRow = async () => {
    const errors = await validateCourierRateDraft(newDraft);
    if (Object.keys(errors).length > 0) {
      setNewErrors(errors);
      toast.error('Revisa los campos marcados.');
      return;
    }
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
    editErrors,
    startEdit,
    cancelEdit,
    updateEditDraft,
    saveEdit,
    isUpdating,
    showNewRow,
    newDraft,
    newErrors,
    openNewRow,
    cancelNewRow,
    updateNewDraft,
    saveNewRow,
    isCreating,
    handleToggleActive,
    isToggling,
  };
};
