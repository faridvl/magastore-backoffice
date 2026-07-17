import { useState } from 'react';
import { toast } from 'sonner';
import { useDeliveryRatesQuery } from '@/shared/api/querys/settings/use-delivery-rates-query';
import {
  useCreateDeliveryRateMutation,
  useUpdateDeliveryRateMutation,
  useToggleDeliveryRateActiveMutation,
  useDeleteDeliveryRateMutation,
} from '@/shared/api/mutations/settings/use-delivery-rate-mutations';
import { DeliveryRate, DeliveryRateInput, DeliveryMethod, DeliveryZone } from '@/types/logistics/logistics.types';

export type DeliveryRateDraft = {
  delivery_method: DeliveryMethod;
  zone: DeliveryZone | null;
  min_weight_kg: string;
  max_weight_kg: string;
  fee_crc: string;
  cost_crc: string;
};

const EMPTY_DRAFT: DeliveryRateDraft = {
  delivery_method: 'CORREOS_CR',
  zone: null,
  min_weight_kg: '',
  max_weight_kg: '',
  fee_crc: '',
  cost_crc: '',
};

function draftToInput(draft: DeliveryRateDraft): DeliveryRateInput {
  return {
    delivery_method: draft.delivery_method,
    zone: draft.zone,
    min_weight_kg: Number(draft.min_weight_kg),
    max_weight_kg: Number(draft.max_weight_kg),
    fee_crc: Number(draft.fee_crc),
    cost_crc: draft.cost_crc.trim() === '' ? null : Number(draft.cost_crc),
  };
}

function rateToDraft(rate: DeliveryRate): DeliveryRateDraft {
  return {
    delivery_method: rate.delivery_method,
    zone: rate.zone,
    min_weight_kg: String(rate.min_weight_kg),
    max_weight_kg: String(rate.max_weight_kg),
    fee_crc: String(rate.fee_crc),
    cost_crc: rate.cost_crc == null ? '' : String(rate.cost_crc),
  };
}

export const useDeliveryRates = () => {
  const { data, isLoading } = useDeliveryRatesQuery();
  const { createDeliveryRate, isPending: isCreating } = useCreateDeliveryRateMutation();
  const { updateDeliveryRate, isPending: isUpdating } = useUpdateDeliveryRateMutation();
  const { toggleDeliveryRateActive, isPending: isToggling } = useToggleDeliveryRateActiveMutation();
  const { deleteDeliveryRate, isPending: isDeleting } = useDeleteDeliveryRateMutation();

  const [confirmingDeleteUuid, setConfirmingDeleteUuid] = useState<string | null>(null);
  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DeliveryRateDraft>(EMPTY_DRAFT);

  const [showNewRow, setShowNewRow] = useState(false);
  const [newDraft, setNewDraft] = useState<DeliveryRateDraft>(EMPTY_DRAFT);

  const rates = data?.data ?? [];

  const startEdit = (rate: DeliveryRate) => {
    setEditingUuid(rate.uuid);
    setEditDraft(rateToDraft(rate));
  };

  const cancelEdit = () => {
    setEditingUuid(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const updateEditDraft = (field: keyof DeliveryRateDraft, value: string) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingUuid) return;
    try {
      await updateDeliveryRate({ uuid: editingUuid, ...draftToInput(editDraft) });
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

  const updateNewDraft = (field: keyof DeliveryRateDraft, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveNewRow = async () => {
    try {
      await createDeliveryRate(draftToInput(newDraft));
      toast.success('Tarifa creada');
      cancelNewRow();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear la tarifa.');
    }
  };

  const handleToggleActive = async (rate: DeliveryRate) => {
    try {
      await toggleDeliveryRateActive({ uuid: rate.uuid, isActive: !rate.is_active });
      toast.success(rate.is_active ? 'Tarifa desactivada' : 'Tarifa activada');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado de la tarifa.');
    }
  };

  // Eliminar en dos pasos: el primer tap arma la confirmación, el segundo ejecuta.
  const requestDelete = (rate: DeliveryRate) => {
    setConfirmingDeleteUuid(rate.uuid);
  };

  const cancelDelete = () => setConfirmingDeleteUuid(null);

  const confirmDelete = async () => {
    if (!confirmingDeleteUuid) return;
    try {
      await deleteDeliveryRate({ uuid: confirmingDeleteUuid });
      toast.success('Tarifa eliminada');
      setConfirmingDeleteUuid(null);
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo eliminar la tarifa.');
    }
  };

  return {
    rates,
    isLoading,
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
    confirmingDeleteUuid,
    requestDelete,
    cancelDelete,
    confirmDelete,
    isDeleting,
  };
};
