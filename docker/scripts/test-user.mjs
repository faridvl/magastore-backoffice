/**
 * Crea o actualiza el usuario ADMIN de prueba (idempotente). Si .env.docker.local no
 * trae TEST_USER_EMAIL / TEST_USER_PASSWORD, los genera y los guarda ahí. La
 * contraseña nunca se imprime.
 */
import bcrypt from 'bcryptjs';
import {
  assertDockerUrl, databaseUrlFrom, ensureTestCredentials, log, psqlOrFail, waitForDatabase,
} from './lib.mjs';

const TEST_USER_NAME = 'Usuario de prueba';
const BCRYPT_ROUNDS = 10;

const env = ensureTestCredentials();
assertDockerUrl(databaseUrlFrom(env));
waitForDatabase();

const hash = await bcrypt.hash(env.TEST_USER_PASSWORD, BCRYPT_ROUNDS);

psqlOrFail(
  `INSERT INTO users (name, email, password, role)
   VALUES (:'name', :'email', :'hash', 'ADMIN')
   ON CONFLICT (email) DO UPDATE
     SET name = EXCLUDED.name, password = EXCLUDED.password, role = 'ADMIN';`,
  'crear el usuario de prueba',
  { vars: { name: TEST_USER_NAME, email: env.TEST_USER_EMAIL, hash } },
);
log(`Usuario de prueba listo (${env.TEST_USER_EMAIL}). La contraseña está en .env.docker.local.`);
