import { useState } from 'react';
import { toast } from 'sonner';
import { useCustomerTypesQuery } from '@/shared/api/querys/customers/use-customer-types-query';
import {
  useCreateCustomerTypeMutation,
  useUpdateCustomerTypeMutation,
  useToggleCustomerTypeActiveMutation,
} from '@/shared/api/mutations/customers/use-customer-type-mutations';
import { CustomerBillingMode, CustomerType, CustomerTypeInput } from '@/types/customer/customer.types';

export type CustomerTypeDraft = {
  name: string;
  billing_mode: CustomerBillingMode;
  discount_percent: string;
};

const EMPTY_DRAFT: CustomerTypeDraft = {
  name: '',
  billing_mode: CustomerBillingMode.NORMAL,
  discount_percent: '',
};

function draftToInput(draft: CustomerTypeDraft): CustomerTypeInput {
  return {
    name: draft.name.trim(),
    billing_mode: draft.billing_mode,
    discount_percent: draft.discount_percent.trim() === '' ? 0 : Number(draft.discount_percent),
  };
}

function typeToDraft(type: CustomerType): CustomerTypeDraft {
  return {
    name: type.name,
    billing_mode: type.billing_mode,
    discount_percent: Number(type.discount_percent) === 0 ? '' : String(type.discount_percent),
  };
}

export const useCustomerTypes = () => {
  const { data, isLoading } = useCustomerTypesQuery();
  const { createCustomerType, isPending: isCreating } = useCreateCustomerTypeMutation();
  const { updateCustomerType, isPending: isUpdating } = useUpdateCustomerTypeMutation();
  const { toggleCustomerTypeActive, isPending: isToggling } = useToggleCustomerTypeActiveMutation();

  const [editingUuid, setEditingUuid] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<CustomerTypeDraft>(EMPTY_DRAFT);

  const [showNewRow, setShowNewRow] = useState(false);
  const [newDraft, setNewDraft] = useState<CustomerTypeDraft>(EMPTY_DRAFT);

  const types = data?.data ?? [];

  const startEdit = (type: CustomerType) => {
    setEditingUuid(type.uuid);
    setEditDraft(typeToDraft(type));
  };

  const cancelEdit = () => {
    setEditingUuid(null);
    setEditDraft(EMPTY_DRAFT);
  };

  const updateEditDraft = (field: keyof CustomerTypeDraft, value: string) => {
    setEditDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveEdit = async () => {
    if (!editingUuid) return;
    try {
      await updateCustomerType({ uuid: editingUuid, ...draftToInput(editDraft) });
      toast.success('Tipo de cliente actualizado');
      cancelEdit();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo actualizar el tipo de cliente.');
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

  const updateNewDraft = (field: keyof CustomerTypeDraft, value: string) => {
    setNewDraft((prev) => ({ ...prev, [field]: value }));
  };

  const saveNewRow = async () => {
    try {
      await createCustomerType(draftToInput(newDraft));
      toast.success('Tipo de cliente creado');
      cancelNewRow();
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo crear el tipo de cliente.');
    }
  };

  const handleToggleActive = async (type: CustomerType) => {
    try {
      await toggleCustomerTypeActive({ uuid: type.uuid, isActive: !type.is_active });
      toast.success(type.is_active ? 'Tipo desactivado' : 'Tipo activado');
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo cambiar el estado del tipo.');
    }
  };

  return {
    types,
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
