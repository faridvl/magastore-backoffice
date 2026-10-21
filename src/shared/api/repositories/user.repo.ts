import sql from '@/lib/db';

export const findByEmail = async (email: string) => {
  const result = await sql`
    SELECT id, name, email, password, role
    FROM users
    WHERE email = ${email}
    LIMIT 1
  `;
  return result[0];
};

export const findNameById = async (id: number): Promise<{ id: number; name: string } | undefined> => {
  const result = await sql`
    SELECT id, name
    FROM users
    WHERE id = ${id}
    LIMIT 1
  `;
  return result[0] as { id: number; name: string } | undefined;
};
