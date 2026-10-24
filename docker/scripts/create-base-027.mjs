/**
 * Deja la base de Docker (vacía) con la estructura que tiene producción hoy:
 * scripts/prod/001-schema.sql y luego scripts/003..027 en orden. Sin tabla
 * schema_migrations, para que migrate.mjs tome el punto de partida del ledger.
 * Los archivos se leen con LF aunque el checkout de Windows los traiga con CRLF (como en CI).
 */
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  MIGRATIONS_DIR, PROD_LAST_VERSION, SCHEMA_FILE, assertDockerUrl, databaseUrlFrom,
  ensureEnvFile, fail, log, parseEnvFile, psqlOrFail, readSql, waitForDatabase,
} from './lib.mjs';

/**
 * El 001 es una introspección del 2026-07-17 y ya trae cosas de migraciones
 * posteriores (p. ej. la restricción de 016). Estas sentencias se ejecutan justo
 * antes del archivo indicado para que corra sin editarlo.
 */
const PRE_STEPS = {
  '016-billing-invoice-number.sql':
    'ALTER TABLE billing DROP CONSTRAINT IF EXISTS billing_invoice_number_key;',
};

ensureEnvFile();
assertDockerUrl(databaseUrlFrom(parseEnvFile()));
waitForDatabase();

const existing = psqlOrFail(`SELECT to_regclass('public.users') IS NOT NULL;`, 'revisar la base', { tuples: true });
if (existing === 't') {
  fail('La base ya tiene tablas. Usa `npm run docker:reset:027` para rehacerla desde cero.');
}

log('Aplicando scripts/prod/001-schema.sql ...');
psqlOrFail(readSql(SCHEMA_FILE), '001-schema.sql');

const files = readdirSync(MIGRATIONS_DIR)
  .filter((name) => /^\d+-.+\.sql$/.test(name) && Number(name.split('-')[0]) <= PROD_LAST_VERSION)
  .sort();

for (const name of files) {
  if (PRE_STEPS[name]) psqlOrFail(PRE_STEPS[name], `preparar ${name}`);
  psqlOrFail(readSql(join(MIGRATIONS_DIR, name)), name);
  log(`OK ${name}`);
}
log(`Base lista en la versión ${String(PROD_LAST_VERSION).padStart(3, '0')} (sin schema_migrations).`);
