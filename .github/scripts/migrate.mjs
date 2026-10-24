/**
 * Aplica las migraciones pendientes de `scripts/NNN-*.sql` contra DATABASE_URL.
 *
 * Lo corre el workflow `migrate-production` al hacer merge a main. El registro
 * de lo aplicado vive en la propia base (tabla schema_migrations), no en
 * db-migrations.json: así el workflow no necesita commitear de vuelta a main.
 *
 * La primera vez que encuentra la tabla vacía toma como punto de partida lo
 * que db-migrations.json registra para el entorno (--env, por defecto prod),
 * sin ejecutarlo. Si ese entorno no tiene nada registrado, se detiene: correr
 * todo desde la 003 sobre una base con datos sería destructivo.
 *
 *   DATABASE_URL=... node .github/scripts/migrate.mjs [--env prod] [--dry-run]
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Pool, neonConfig } from '@neondatabase/serverless';

const MIGRATIONS_DIR = 'scripts';
const LEDGER_FILE = 'db-migrations.json';
const MIGRATION_PATTERN = /^(\d+)-.+\.sql$/;

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const envIndex = args.indexOf('--env');
const ledgerEnv = envIndex >= 0 ? args[envIndex + 1] : 'prod';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Falta la variable DATABASE_URL.');
  process.exit(1);
}

// Node 22+ trae WebSocket global; el Pool de Neon lo necesita para hablar el
// protocolo de Postgres (transacciones y varias sentencias por archivo).
neonConfig.webSocketConstructor = WebSocket;

const checksum = (path) => createHash('sha256').update(readFileSync(path)).digest('hex').slice(0, 16);

const migrations = readdirSync(MIGRATIONS_DIR)
  .filter((name) => MIGRATION_PATTERN.test(name))
  .map((name) => ({
    name,
    version: name.match(MIGRATION_PATTERN)[1],
    path: join(MIGRATIONS_DIR, name),
  }))
  .sort((a, b) => Number(a.version) - Number(b.version) || a.name.localeCompare(b.name));

const readBaseline = () => {
  const ledger = JSON.parse(readFileSync(LEDGER_FILE, 'utf8'));
  const applied = ledger.environments?.[ledgerEnv]?.applied ?? [];
  return applied.map((entry) => entry.name);
};

const pool = new Pool({ connectionString: databaseUrl });
const client = await pool.connect();

try {
  const { rows: tableRows } = await client.query(`SELECT to_regclass('public.schema_migrations') AS name`);
  const hasTable = tableRows[0].name !== null;

  let appliedNames = new Set();
  if (hasTable) {
    const { rows } = await client.query('SELECT name FROM schema_migrations');
    appliedNames = new Set(rows.map((row) => row.name));
  }

  if (appliedNames.size === 0) {
    const baseline = readBaseline();
    if (baseline.length === 0) {
      throw new Error(
        `La base no tiene registro y ${LEDGER_FILE} no tiene nada para "${ledgerEnv}". ` +
          'Registra a mano lo que ya está aplicado antes de automatizar.',
      );
    }
    console.log(`Punto de partida: ${baseline.length} migraciones ya aplicadas según ${LEDGER_FILE} (${ledgerEnv}).`);
    if (!isDryRun) {
      // Todo o nada: un punto de partida a medias haría que la próxima corrida
      // ejecute migraciones viejas sobre la base con datos.
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
          [name, name.match(MIGRATION_PATTERN)?.[1] ?? '', migration ? checksum(migration.path) : null],
        );
      }
      await client.query('COMMIT');
    }
    appliedNames = new Set(baseline);
  }

  const pending = migrations.filter((m) => !appliedNames.has(m.name));
  if (pending.length === 0) {
    console.log('No hay migraciones pendientes.');
  } else {
    console.log(`Pendientes (${pending.length}): ${pending.map((m) => m.name).join(', ')}`);
  }

  if (isDryRun) {
    console.log('--dry-run: no se ejecutó nada.');
  } else {
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
          [migration.name, migration.version, checksum(migration.path), actor],
        );
        await client.query('COMMIT');
        console.log(`OK ${migration.name}`);
      } catch (error) {
        await client.query('ROLLBACK').catch(() => {});
        throw new Error(`Falló ${migration.name}: ${error.message}`);
      }
    }
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
