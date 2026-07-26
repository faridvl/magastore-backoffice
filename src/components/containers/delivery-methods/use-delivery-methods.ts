import { useState } from 'react';
import { toast } from 'sonner';
import { useDeliveryMethodsQuery } from '@/shared/api/querys/logistics/use-delivery-methods-query';
import {
  useCreateDeliveryMethodMutation,
  useUpdateDeliveryMethodMutation,
  useToggleDeliveryMethodActiveMutation,
} from '@/shared/api/mutations/logistics/use-delivery-method-mutations';
import { DeliveryMethodEntity, DeliveryMethodInput } from '@/types/logistics/logistics.types';

export type DeliveryMethodDraft = {
  code: string;
  name: string;
  requires_zone: boolean;
  is_pickup: boolean;
};

const EMPTY_DRAFT: DeliveryMethodDraft = {
  code: '',
  name: '',
  requires_zone: true,
  is_pickup: false,
};

function draftToInput(draft: DeliveryMethodDraft): DeliveryMethodInput {
  return {
    code: draft.code.trim(),
    name: draft.name.trim(),
    requires_zone: draft.requires_zone,
    is_pickup: draft.is_pickup,
  };
}

function methodToDraft(method: DeliveryMethodEntity): DeliveryMethodDraft {
  return {
    code: method.code,
    name: method.name,
    requires_zone: method.requires_zone,
    is_pickup: method.is_pickup,
  };
}

export const useDeliveryMethods = () => {
  const { data, isLoading } = useDeliveryMethodsQuery();
  const { createDeliveryMethod, isPending: isCreating } = useCreateDeliveryMethodMutation();
  const { updateDeliveryMethod, isPending: isUpdating } = useUpdateDeliveryMethodMutation();
  const { toggleDeliveryMethodActive, isPending: isToggling } = useToggleDeliveryMethodActiveMutation();

  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DeliveryMethodDraft>(EMPTY_DRAFT);

  const [showNewRow, setShowNewRow] = useState(false);
  const [newDraft, setNewDraft] = useState<DeliveryMethodDraft>(EMPTY_DRAFT);

  const methods = data?.data ?? [];

  const startEdit = (method: DeliveryMethodEntity) => {
    setEditingUuid(method.uuid);
    setEditDraft(methodToDraft(method));
  };

  const cancelEdit = () => {
    setEditingUuid(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const updateEditDraft = (field: keyof DeliveryMethodDraft, value: string | boolean) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingUuid) return;
    try {
      await updateDeliveryMethod({ uuid: editingUuid, ...draftToInput(editDraft) });
      toast.success('Método de entrega actualizado');
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar el método de entrega.');
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

  const updateNewDraft = (field: keyof DeliveryMethodDraft, value: string | boolean) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveNewRow = async () => {
    try {
      await createDeliveryMethod(draftToInput(newDraft));
      toast.success('Método de entrega creado');
      cancelNewRow();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el método de entrega.');
    }
  };

  const handleToggleActive = async (method: DeliveryMethodEntity) => {
    try {
      await toggleDeliveryMethodActive({ uuid: method.uuid, isActive: !method.is_active });
      toast.success(method.is_active ? 'Método desactivado' : 'Método activado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado del método.');
    }
  };

  return {
    methods,
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
  };
};
