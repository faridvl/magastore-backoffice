import sql from '@/lib/db';
import { CustomerRecipient, CustomerRecipientInput } from '@/types/customer/customer.types';

export const CustomerRecipientsRepository = {
  list: async (customerId: string): Promise<CustomerRecipient[]> => {
    const rows = await sql`
      SELECT id, customer_id, full_name, phone, id_card, created_at
      FROM customer_recipients
      WHERE customer_id = ${customerId}
      ORDER BY created_at ASC
    `;
    return rows as CustomerRecipient[];
  },

  upsert: async (customerId: string, input: CustomerRecipientInput): Promise<CustomerRecipient[]> => {
    if (input.id) {
      const [updated] = await sql`
        UPDATE customer_recipients
        SET full_name = ${input.full_name}, phone = ${input.phone ?? null}, id_card = ${input.id_card ?? null}
        WHERE id = ${input.id} AND customer_id = ${customerId}
        RETURNING id
      `;
      if (!updated) throw new Error('La persona no existe o no pertenece a este cliente.');
    } else {
      await sql`
        INSERT INTO customer_recipients (customer_id, full_name, phone, id_card)
        VALUES (${customerId}, ${input.full_name}, ${input.phone ?? null}, ${input.id_card ?? null})
      `;
    }
    return CustomerRecipientsRepository.list(customerId);
  },

  remove: async (customerId: string, recipientId: string): Promise<CustomerRecipient[]> => {
    const [deleted] = await sql`
      DELETE FROM customer_recipients WHERE id = ${recipientId} AND customer_id = ${customerId}
      RETURNING id
    `;
    if (!deleted) throw new Error('La persona no existe o no pertenece a este cliente.');
    return CustomerRecipientsRepository.list(customerId);
  },
};
