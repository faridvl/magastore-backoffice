/**
 * Carga los escenarios ficticios de docker/seed/NN-*.sql (en orden, idempotentes) y
 * deja listo el usuario de prueba. Se niega si la base no es la de Docker o si no
 * está en la versión 036 del esquema.
 */
import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  ROOT, SEED_DIR, SEED_LAST_VERSION, assertDockerUrl, databaseUrlFrom, ensureEnvFile, fail, log,
  parseEnvFile, psqlOrFail, readSql, waitForDatabase,
} from './lib.mjs';

ensureEnvFile();
assertDockerUrl(databaseUrlFrom(parseEnvFile()));
waitForDatabase();

const identity = psqlOrFail(`SELECT current_database();`, 'revisar la base', { tuples: true });
if (identity !== 'magastore') fail('La base conectada no es la de Docker. No se siembra nada.');

const schemaState = psqlOrFail(
  `SELECT
     (to_regclass('public.customer_recipients') IS NOT NULL)::text || ',' ||
     (to_regclass('public.schema_migrations') IS NOT NULL)::text`,
  'revisar el esquema',
  { tuples: true },
);
const [hasRecipients, hasLedger] = schemaState.split(',');
const hasLastMigration =
  hasLedger === 'true' &&
  psqlOrFail(
    `SELECT count(*) FROM schema_migrations WHERE version = '${SEED_LAST_VERSION}';`,
    'revisar el registro de migraciones',
    { tuples: true },
  ) === '1';
if (hasRecipients !== 'true' || !hasLastMigration) {
  fail(
    `La base no está en la migración ${SEED_LAST_VERSION}. Corre \`npm run docker:migrate\` ` +
      '(o `npm run docker:reset`) antes de sembrar.',
  );
}

// El usuario va primero: las facturas del seed se atribuyen al primer usuario de la base.
const user = spawnSync(process.execPath, [join(ROOT, 'docker', 'scripts', 'test-user.mjs')], {
  cwd: ROOT,
  stdio: 'inherit',
});
if (user.status !== 0) fail('No se pudo dejar listo el usuario de prueba.');

// Todos los archivos en una sola llamada y una sola transacción: o queda el seed completo o no cambia
// nada. Cada uno lleva un comentario con su nombre para ubicar un error.
const files = readdirSync(SEED_DIR).filter((name) => /^\d+-.+\.sql$/.test(name)).sort();
const script = files
  .map((name) => `-- ===== ${name} =====\n${readSql(join(SEED_DIR, name))}`)
  .join('\n');
psqlOrFail(script, `sembrar ${files.length} archivos`, { singleTransaction: true });
log(`OK ${files.join(', ')}`);
