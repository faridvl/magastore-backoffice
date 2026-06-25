import * as UserRepo from '../repositories/user.repo';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

export const login = async (email: string, pass: string) => {
  const user = await UserRepo.findByEmail(email);

  if (!user) {
    throw new Error('Las credenciales no coinciden con nuestros registros.');
  }

  const isMatch = await bcrypt.compare(pass, user.password);
  if (!isMatch) {
    throw new Error('Las credenciales no coinciden con nuestros registros.');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET || 'clave_secreta_por_defecto',
    { expiresIn: '12h' },
  );

  return {
    token,
    user: { id: user.id, name: user.name, email: user.email, role: user.role ?? 'ADMIN' },
  };
};
