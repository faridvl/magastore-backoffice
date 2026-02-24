import sql from '@/lib/db';

export const findByEmail = async (email: string) => {
  const result = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
  return result[0];
};
