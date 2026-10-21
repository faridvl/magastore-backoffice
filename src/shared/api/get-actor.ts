import type { NextApiRequest, NextApiResponse } from 'next';
import type { GetServerSidePropsContext } from 'next';
import jwt from 'jsonwebtoken';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import * as UserRepo from '@/shared/api/repositories/user.repo';

export interface Actor {
  id: number;
  name: string;
}

interface JwtPayload {
  id: number | string;
  email: string;
}

const isJwtPayload = (value: unknown): value is JwtPayload =>
  typeof value === 'object' &&
  value !== null &&
  'id' in value &&
  (typeof value.id === 'number' || typeof value.id === 'string');

/**
 * Única puerta de entrada a la autoría: quién ejecuta la acción. El id sale del
 * JWT verificado (la cookie no lo guarda) y el nombre de la tabla users, porque
 * una llamada con Bearer no trae la cookie del nombre.
 *
 * Devuelve null si no hay token o no es válido: el handler responde 401.
 */
export async function getActor(context: { req: NextApiRequest; res: NextApiResponse }): Promise<Actor | null> {
  const cookieContext = context as unknown as GetServerSidePropsContext;
  let token = CookiesManager.getAccessToken(cookieContext);
  const authorization = context.req.headers.authorization;
  if (!token && authorization) {
    const parts = authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') token = parts[1];
  }
  if (!token) return null;

  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET no está configurado en las variables de entorno.');

  let payload: unknown;
  try {
    payload = jwt.verify(token, secret);
  } catch {
    return null;
  }
  if (!isJwtPayload(payload)) return null;

  const userId = Number(payload.id);
  if (!Number.isInteger(userId)) return null;

  const user = await UserRepo.findNameById(userId);
  if (!user) return null;

  return { id: user.id, name: user.name };
}
