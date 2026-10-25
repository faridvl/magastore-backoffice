import { CustomerRecipientInput } from '@/types/customer/customer.types';
import { CustomerRecipientsRepository } from '../repositories/customer-recipients.repo';
import { isUuid } from '@/shared/utils/is-uuid';

const NOT_FOUND_MESSAGE = 'La persona no existe o no pertenece a este cliente.';

export const CustomerRecipientsService = {
  list: async (customerId: string) => {
    if (!isUuid(customerId)) throw new Error('Cliente no encontrado.');
    return CustomerRecipientsRepository.list(customerId);
  },

  save: async (customerId: string, input: CustomerRecipientInput) => {
    if (!isUuid(customerId)) throw new Error('Cliente no encontrado.');
    if (input.id && !isUuid(input.id)) throw new Error(NOT_FOUND_MESSAGE);
    const fullName = input.full_name?.trim().toUpperCase();
    if (!fullName) throw new Error('El nombre de quien recibe es requerido.');
    return CustomerRecipientsRepository.upsert(customerId, {
      id: input.id,
      full_name: fullName,
      phone: input.phone?.trim() || null,
      id_card: input.id_card?.trim() || null,
    });
  },

  remove: async (customerId: string, recipientId: string) => {
    if (!isUuid(customerId) || !recipientId || !isUuid(recipientId)) throw new Error(NOT_FOUND_MESSAGE);
    return CustomerRecipientsRepository.remove(customerId, recipientId);
  },
};
