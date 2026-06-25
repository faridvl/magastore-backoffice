-- Etapa 12: Multi-rol
-- Agrega la columna role a la tabla users con default ADMIN
-- para no romper usuarios existentes.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'ADMIN';

-- Verificacion
SELECT id, email, role FROM users;
