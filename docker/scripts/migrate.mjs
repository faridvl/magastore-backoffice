/**
 * Ensayo del pase a producción: corre el .github/scripts/migrate.mjs real contra la
 * base de Docker con el mismo flujo del workflow (primero --plan, luego --apply
 * con --confirm y --expect-pending).
 *
 *   node docker/scripts/migrate.mjs --plan                 solo muestra lo pendiente
 *   node docker/scripts/migrate.mjs                        plan y aplicación
 *   node docker/scripts/migrate.mjs --allow-dirty          permite migraciones sin commitear
 *
 * Como en CI, el ensayo es lo que está commiteado: se detiene si hay cambios en scripts/NNN-*.sql.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DB_NAME, MIGRATIONS_DIR, ROOT, assertDockerUrl, databaseUrlFrom, ensureEnvFile, fail, log,
  parseEnvFile, waitForDatabase, waitForProxy,
} from './lib.mjs';

const MIGRATE_SCRIPT = join(ROOT, '.github', 'scripts', 'migrate.mjs');
const PRELOAD = pathToFileURL(join(ROOT, 'docker', 'scripts', 'neon-local-config.mjs')).href;
const LEDGER_ENV = 'prod';
const SHORT_SHA_LENGTH = 7;
const MIGRATION_PATH_PATTERN = /scripts\/\d+-[^/]+\.sql$/;

const isPlanOnly = process.argv.includes('--plan');
const allowDirty = process.argv.includes('--allow-dirty');

ensureEnvFile();
const databaseUrl = databaseUrlFrom(parseEnvFile());
const parsed = assertDockerUrl(databaseUrl);
waitForDatabase();
await waitForProxy(databaseUrl);

const git = (args) => spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });

const head = git(['rev-parse', 'HEAD']);
const commitSha = (head.stdout || '').trim();
if (head.status !== 0 || !commitSha) fail('No se pudo leer el commit actual (git rev-parse HEAD).');

const status = git(['status', '--porcelain', '--', 'scripts']);
const dirtyMigrations = (status.stdout || '')
  .split(/\r?\n/)
  .map((line) => line.slice(3).trim())
  .filter((path) => MIGRATION_PATH_PATTERN.test(path));
if (dirtyMigrations.length > 0 && !allowDirty) {
  fail(
    `Hay migraciones sin commitear: ${dirtyMigrations.join(', ')}.\n` +
      'El ensayo debe correr lo commiteado, como en CI. Haz commit o usa --allow-dirty ' +
      '(`npm run docker:migrate -- --allow-dirty`).',
  );
}

const workDir = mkdtempSync(join(tmpdir(), 'magastore-migrate-'));
const outputFile = join(workDir, 'output');
process.on('exit', () => rmSync(workDir, { recursive: true, force: true }));

const runMigrate = (extraArgs, extraEnv = {}) =>
  spawnSync(
    process.execPath,
    ['--import', PRELOAD, MIGRATE_SCRIPT, ...extraArgs, '--env', LEDGER_ENV],
    {
      cwd: ROOT,
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
        EXPECTED_DATABASE_HOST: parsed.hostname,
        EXPECTED_DATABASE_NAME: DB_NAME,
        TARGET_ENVIRONMENT: 'docker-local',
        COMMIT_SHA: commitSha,
        ...extraEnv,
      },
    },
  );

const plan = runMigrate(['--plan'], { GITHUB_OUTPUT: outputFile });
if (plan.status !== 0) fail('El plan de migraciones falló.');

const outputs = Object.fromEntries(
  readFileSync(outputFile, 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]),
);
const pending = outputs.pending ? outputs.pending.split(',') : [];

// migrate.mjs lee de disco: el checksum de cada migración y, al tomar el punto de partida, el de
// 003–027 salen de esos bytes. Con CRLF no coincidirían con lo que produce CI (LF) y los textos que
// comparan contenido (p. ej. la 036) no se aplicarían. Se revisan todas, no solo las pendientes.
const crlfFiles = readdirSync(MIGRATIONS_DIR)
  .filter((name) => /^\d+-.+\.sql$/.test(name))
  .filter((name) => readFileSync(join(MIGRATIONS_DIR, name)).includes(0x0d));
if (crlfFiles.length > 0) {
  const message =
    `Estas migraciones están en disco con CRLF y en git con LF: ${crlfFiles.join(', ')}.\n` +
    'Déjalas como en git: borra los archivos y corre `git checkout -- scripts` ' +
    '(el .gitattributes fuerza LF al restaurarlos).';
  if (isPlanOnly) console.warn(`Advertencia: ${message}`);
  else fail(message);
}

if (pending.length === 0) process.exit(0);

const confirm = `${outputs.last}@${commitSha.slice(0, SHORT_SHA_LENGTH)}`;
log(`Plan (${pending.length}): ${pending.join(', ')}`);
log(`Confirmar: ${confirm}`);
if (isPlanOnly) process.exit(0);

const apply = runMigrate(['--apply', '--confirm', confirm, '--expect-pending', outputs.pending]);
if (apply.status !== 0) fail('La aplicación de migraciones falló.');
