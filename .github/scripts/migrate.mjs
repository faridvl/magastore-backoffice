/**
 * Planifica o aplica las migraciones de `scripts/NNN-*.sql` contra DATABASE_URL.
 *
 *   node .github/scripts/migrate.mjs --plan [--env prod]
 *   node .github/scripts/migrate.mjs --apply --confirm 036@1a2b3c4 --expect-pending "a.sql,b.sql" [--env prod]
 *
 * Variables: DATABASE_URL, EXPECTED_DATABASE_HOST, EXPECTED_DATABASE_NAME ,
 * COMMIT_SHA (commit que se ejecuta) y TARGET_ENVIRONMENT (solo para los mensajes). El repo es público: nunca se
 * imprime la URL, el host, el nombre de la base ni datos.
 *
 * El registro de lo aplicado vive en la tabla schema_migrations. Si está vacía,
 * el punto de partida sale de db-migrations.json (--env) sin ejecutarlo; si ese
 * entorno no tiene nada registrado se detiene: correr todo desde la 003 sobre
 * una base con datos sería destructivo.
 */
import { appendFileSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';
import {
  BASELINE_PROBES,
  checkConfirmation,
  checkTarget,
  computePlan,
  formatConfirmation,
  versionOf,
} from './migration-plan.mjs';

const MIGRATIONS_DIR = 'scripts';
const LEDGER_FILE = 'db-migrations.json';
const MIGRATION_PATTERN = /^(\d+)-.+\.sql$/;
const DEFAULT_TARGET_ENVIRONMENT = 'db-production';
const commitSha = process.env.COMMIT_SHA || process.env.GITHUB_SHA || '';
const REQUIRED_TABLES = ['users', 'customers', 'consolidations', 'billing', 'whatsapp_templates'];

const fail = (messages) => {
  for (const message of [].concat(messages)) console.error(message);
  process.exit(1);
};

const args = process.argv.slice(2);
const optionValue = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};
const isPlan = args.includes('--plan') || args.includes('--dry-run');
const isApply = args.includes('--apply');
const ledgerEnv = optionValue('--env') ?? 'prod';
const confirm = optionValue('--confirm');
const expectedPending = (optionValue('--expect-pending') ?? '')
  .split(',')
  .map((name) => name.trim())
  .filter(Boolean);

if (isPlan === isApply) {
  fail('Uso: migrate.mjs --plan  |  migrate.mjs --apply --confirm <versión>@<sha7> --expect-pending "<a.sql,b.sql>"');
}

const environmentName = process.env.TARGET_ENVIRONMENT || DEFAULT_TARGET_ENVIRONMENT;
const expectedName = process.env.EXPECTED_DATABASE_NAME;
const targetErrors = checkTarget({
  databaseUrl: process.env.DATABASE_URL,
  expectedHost: process.env.EXPECTED_DATABASE_HOST,
  expectedName,
  environmentName,
});
if (targetErrors.length > 0) fail(targetErrors);

// Node 22+ trae WebSocket global; el Pool de Neon lo necesita para hablar el
// protocolo de Postgres (transacciones y varias sentencias por archivo).
neonConfig.webSocketConstructor = WebSocket;

const checksumOf = (migration) =>
  createHash('sha256').update(readFileSync(migration.path)).digest('hex').slice(0, 16);

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => MIGRATION_PATTERN.test(name))
  .map((name) => ({ name, version: versionOf(name), path: join(MIGRATIONS_DIR, name) }));

const readBaseline = () => {
  const ledger = JSON.parse(readFileSync(LEDGER_FILE, 'utf8'));
  return (ledger.environments?.[ledgerEnv]?.applied ?? []).map((entry) => entry.name);
};

const writeSummary = (pending, checksums) => {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryFile) return;
  const lines = ['## Plan de migraciones', ''];
  if (pending.length === 0) {
    lines.push('No hay migraciones pendientes.');
  } else {
    const last = pending[pending.length - 1].version;
    lines.push('| Versión | Archivo | Checksum |', '|---|---|---|');
    for (const migration of pending) {
      lines.push(`| ${migration.version} | \`${migration.name}\` | \`${checksums.get(migration.name)}\` |`);
    }
    lines.push(
      '',
      '### Cómo aplicarlas',
      '',
      `1. Actions → **Migraciones de producción** → **Run workflow**.`,
      `2. Rama: \`main\`.`,
      `3. Marca **aplicar** y escribe en **confirmar**: \`${formatConfirmation(last, commitSha)}\`.`,
    );
  }
  appendFileSync(summaryFile, lines.join('\n') + '\n');
};

// Los logs son públicos: del error de la base solo se muestra el código y el
// mensaje hasta el primer ":" sin textos entre comillas, donde viajan los valores.
const describeDatabaseError = (error) => {
  const message = String(error?.message ?? '').split(':')[0].replace(/"[^"]*"/g, '"…"');
  return error?.code ? `[${error.code}] ${message}` : message;
};

const findAlreadyApplied = async (pending) => {
  for (const migration of pending) {
    const probe = BASELINE_PROBES[migration.name];
    if (!probe) continue;
    const { rows } = await client.query(probe);
    if (rows.length > 0) return migration;
  }
  return null;
};

const writeOutputs = (pending) => {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;
  const last = pending.length > 0 ? pending[pending.length - 1].version : '';
  appendFileSync(
    outputFile,
    `pending=${pending.map((migration) => migration.name).join(',')}\nlast=${last}\n`,
  );
};

const writeBaseline = async (baseline) => {
  // Todo o nada: un punto de partida a medias haría que la próxima corrida
  // ejecute migraciones viejas sobre la base con datos.
  try {
    await client.query('BEGIN');
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name        TEXT PRIMARY KEY,
        version     TEXT NOT NULL,
        checksum    TEXT,
        applied_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        applied_by  TEXT NOT NULL,
        is_baseline BOOLEAN NOT NULL DEFAULT false
      )`);
    for (const name of baseline) {
      const migration = migrations.find((m) => m.name === name);
      await client.query(
        `INSERT INTO schema_migrations (name, version, checksum, applied_by, is_baseline)
         VALUES ($1, $2, $3, 'baseline', true) ON CONFLICT (name) DO NOTHING`,
        [name, versionOf(name) ?? '', checksumOf(migration)],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  }
};

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
let client;

try {
  // El error del driver puede traer el host: no se propaga su texto.
  try {
    client = await pool.connect();
  } catch {
    throw new Error('No se pudo conectar a la base. Revisa DATABASE_URL y que la base esté disponible.');
  }

  const { rows: identityRows } = await client.query('SELECT current_database() AS name');
  if (identityRows[0].name !== expectedName) {
    throw new Error('La base conectada no coincide con EXPECTED_DATABASE_NAME.');
  }
  const { rows: tableRows } = await client.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [REQUIRED_TABLES],
  );
  if (tableRows.length !== REQUIRED_TABLES.length) {
    throw new Error('La base conectada no parece la base de Magastore: faltan tablas esperadas.');
  }

  const { rows: registryRows } = await client.query(`SELECT to_regclass('public.schema_migrations') AS name`);
  const hasRegistry = registryRows[0].name !== null;

  let appliedNames = [];
  let baselineToWrite = null;
  const appliedChecksums = new Map();
  if (hasRegistry) {
    const { rows } = await client.query('SELECT name, checksum FROM schema_migrations');
    appliedNames = rows.map((row) => row.name);
    for (const row of rows) appliedChecksums.set(row.name, row.checksum);
  }

  if (appliedNames.length === 0) {
    const baseline = readBaseline();
    if (baseline.length === 0) {
      throw new Error(
        `La base no tiene registro y ${LEDGER_FILE} no tiene nada para "${ledgerEnv}". ` +
          'Registra a mano lo que ya está aplicado antes de automatizar.',
      );
    }
    const missingFiles = baseline.filter((name) => !migrations.some((m) => m.name === name));
    if (missingFiles.length > 0) {
      throw new Error(`${LEDGER_FILE} (${ledgerEnv}) nombra archivos que no existen: ${missingFiles.join(', ')}.`);
    }
    console.log(`Punto de partida: ${baseline.length} migraciones ya aplicadas según ${LEDGER_FILE} (${ledgerEnv}).`);

    const baselineSet = new Set(baseline);
    const alreadyApplied = await findAlreadyApplied(migrations.filter((m) => !baselineSet.has(m.name)));
    if (alreadyApplied) {
      const lastInLedger = [...baseline].sort().at(-1);
      throw new Error(
        `La base ya tiene cambios de ${alreadyApplied.name} pero ${LEDGER_FILE} (${ledgerEnv}) dice que va en ${lastInLedger}: ` +
          'no coincide con la base esperada o el registro está desactualizado.',
      );
    }
    appliedNames = baseline;
    baselineToWrite = baseline;
  }

  const { pending, warnings, errors } = computePlan({
    migrations,
    appliedNames,
    appliedChecksums,
    checksumOf,
  });

  for (const warning of warnings) console.warn(`Advertencia: ${warning}`);
  if (errors.length > 0) fail(errors);

  if (pending.length === 0) {
    console.log('No hay migraciones pendientes.');
  } else {
    console.log(`Pendientes (${pending.length}): ${pending.map((m) => m.name).join(', ')}`);
  }

  if (isPlan) {
    writeSummary(pending, new Map(pending.map((m) => [m.name, checksumOf(m)])));
    writeOutputs(pending);
    console.log('--plan: no se escribió nada en la base.');
  } else if (pending.length > 0) {
    const confirmationErrors = checkConfirmation({ pending, confirm, expectedPending, commitSha });
    if (confirmationErrors.length > 0) fail(confirmationErrors);

    if (baselineToWrite) await writeBaseline(baselineToWrite);

    const actor = process.env.GITHUB_ACTOR ? `github:${process.env.GITHUB_ACTOR}` : 'manual';
    for (const migration of pending) {
      const sql = readFileSync(migration.path, 'utf8');
      // Cada migración con su registro en la misma transacción: si falla, no
      // queda aplicada a medias ni marcada como hecha, y la siguiente corrida
      // reintenta desde ella.
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query(
          `INSERT INTO schema_migrations (name, version, checksum, applied_by) VALUES ($1, $2, $3, $4)`,
          [migration.name, migration.version, checksumOf(migration), actor],
        );
        await client.query('COMMIT');
        console.log(`OK ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Falló ${migration.name}: ${describeDatabaseError(error)}`);
      }
    }
  }
} catch (error) {
  console.error(error.code ? describeDatabaseError(error) : error.message);
  process.exitCode = 1;
} finally {
  client?.release();
  await pool.end();
}
