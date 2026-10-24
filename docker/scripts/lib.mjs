/**
 * Utilidades compartidas de los scripts del entorno local con Docker.
 * Nada de lo que se imprime aquí incluye contraseñas ni tokens.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync, appendFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const COMPOSE_FILE = join(ROOT, 'docker', 'compose.yml');
/** Gana sobre COMPOSE_PROJECT_NAME del entorno: el volumen es el mismo desde cualquier checkout. */
export const COMPOSE_PROJECT = 'magastore-local';
export const SEED_DIR = join(ROOT, 'docker', 'seed');
export const MIGRATIONS_DIR = join(ROOT, 'scripts');
export const SCHEMA_FILE = join(ROOT, 'scripts', 'prod', '001-schema.sql');

export const DB_NAME = 'magastore';
export const DB_HOST_PORT = 54329;
/** Debe coincidir con LOCAL_DATABASE_HOST de src/lib/db.ts (con el proxy no sirven 127.0.0.1 ni localhost). */
export const LOCAL_DATABASE_HOST = 'db.localtest.me';
/** El proxy de Neon deduce el endpoint del primer tramo del host y valida el resto contra localtest.me. */
export const DEFAULT_DATABASE_URL = `postgres://postgres:postgres@db.localtest.me:${DB_HOST_PORT}/${DB_NAME}`;
export const LOCAL_PROXY_PORT = 4444;
/** Última migración que la base ya tiene cuando se rehace "como producción". */
export const PROD_LAST_VERSION = 27;
export const SEED_LAST_VERSION = '036';
export const DEV_PORT = 3030;

/** Clave inválida a propósito: el constructor de Resend exige una no vacía, y esta nunca envía correos. */
export const DISABLED_RESEND_KEY = 're_docker_local_sin_envio';

const PROXY_WAIT_ATTEMPTS = 30;
const PROXY_WAIT_INTERVAL_MS = 1000;
const PROXY_REQUEST_TIMEOUT_MS = 2000;

export const log = (message) => console.log(message);

export const fail = (message) => {
  console.error(message);
  process.exit(1);
};

/**
 * `.env.docker.local` vive en la raíz del checkout principal (el padre de `.git` común), igual
 * desde el repo original o desde cualquier worktree: la base es una sola y sus credenciales también.
 */
const resolveMainCheckoutRoot = () => {
  const result = spawnSync('git', ['rev-parse', '--git-common-dir'], { cwd: ROOT, encoding: 'utf8' });
  const commonDir = (result.stdout || '').trim();
  if (result.status !== 0 || !commonDir) return ROOT;
  return dirname(resolve(ROOT, commonDir));
};

export const ENV_FILE = join(resolveMainCheckoutRoot(), '.env.docker.local');

/** Lee un .sql normalizando CRLF a LF, como queda en git y en CI (el checkout de Windows puede traer CRLF). */
export const readSql = (path) => readFileSync(path, 'utf8').replace(/\r\n/g, '\n');

export const randomSecret = (bytes = 32) => randomBytes(bytes).toString('base64url');

export const parseEnvFile = (path = ENV_FILE) => {
  const values = {};
  if (!existsSync(path)) return values;
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
};

/** Crea `.env.docker.local` (ignorado por git) con valores locales si todavía no existe. */
export const ensureEnvFile = () => {
  if (existsSync(ENV_FILE)) return;
  const lines = [
    '# Generado por docker/scripts. No se versiona (.env*.local). Lo comparten todos los checkouts.',
    `MAGASTORE_DB_POSTGRES_URL=${DEFAULT_DATABASE_URL}`,
    `JWT_SECRET=${randomSecret(48)}`,
    `RESEND_API_KEY=${DISABLED_RESEND_KEY}`,
    'NEXT_PUBLIC_API_URL=/api',
    '',
  ];
  writeFileSync(ENV_FILE, lines.join('\n'), 'utf8');
  log('Creado .env.docker.local con valores locales.');
};

export const databaseUrlFrom = (env) => env.MAGASTORE_DB_POSTGRES_URL || DEFAULT_DATABASE_URL;

/** Se niega a seguir si la URL no apunta a la base local de Docker. */
export const assertDockerUrl = (url) => {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    fail('La URL de la base no es válida. Revisa .env.docker.local.');
  }
  const name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  const isLocal =
    parsed.hostname === LOCAL_DATABASE_HOST &&
    Number(parsed.port) === DB_HOST_PORT &&
    name === DB_NAME;
  if (!isLocal) {
    const isLoopback = ['127.0.0.1', 'localhost'].includes(parsed.hostname);
    fail(
      'La URL de la base no es la de Docker (host ' + LOCAL_DATABASE_HOST + `, puerto ${DB_HOST_PORT}, base "${DB_NAME}"). No se toca nada.` +
        (isLoopback
          ? `
En .env.docker.local cambia el host de MAGASTORE_DB_POSTGRES_URL por ${LOCAL_DATABASE_HOST}: el proxy no acepta 127.0.0.1 ni localhost.`
          : ''),
    );
  }
  return parsed;
};

const composeArgs = (args) => ['compose', '-p', COMPOSE_PROJECT, '-f', COMPOSE_FILE, ...args];

export const compose = (args, { quiet = false } = {}) => {
  const result = spawnSync('docker', composeArgs(args), {
    cwd: ROOT,
    stdio: quiet ? 'pipe' : 'inherit',
    encoding: 'utf8',
  });
  if (result.error) fail('No se pudo ejecutar docker. ¿Está instalado y en el PATH?');
  return result;
};

export const composeOrFail = (args, label) => {
  const result = compose(args);
  if (result.status !== 0) fail(`Falló: ${label}.`);
};

export const waitForDatabase = () => composeOrFail(['up', '-d', '--wait'], 'levantar los contenedores');

/**
 * `--wait` no espera al proxy (no tiene healthcheck). Se hace la misma petición que arma la app:
 * `http://<host de la URL>:4444/sql` con `Neon-Connection-String` y `select 1`, y se exige 200 con una
 * fila. Sirve también de prueba del host. Nunca imprime la cadena de conexión.
 */
export const waitForProxy = async (databaseUrl) => {
  const host = new URL(databaseUrl).hostname;
  const endpoint = `http://${host}:${LOCAL_PROXY_PORT}/sql`;
  let lastStatus = null;
  for (let attempt = 1; attempt <= PROXY_WAIT_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Neon-Connection-String': databaseUrl, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'select 1 as ok', params: [] }),
        signal: AbortSignal.timeout(PROXY_REQUEST_TIMEOUT_MS),
      });
      if (response.ok) {
        const body = await response.json().catch(() => null);
        if (Array.isArray(body?.rows) && body.rows.length === 1) return;
      }
      lastStatus = response.status;
    } catch (error) {
      const code = error?.cause?.code;
      if (code === 'ENOTFOUND') {
        fail(
          `El host ${host} no resuelve. Agrega la línea \`127.0.0.1 ${host}\` al archivo hosts ` +
            '(en Windows: C:/Windows/System32/drivers/etc/hosts, como administrador).',
        );
      }
    }
    await new Promise((done) => setTimeout(done, PROXY_WAIT_INTERVAL_MS));
  }
  fail(
    lastStatus === null
      ? `El proxy de Neon no responde en ${host}:${LOCAL_PROXY_PORT}. Revisa \`docker compose -p ${COMPOSE_PROJECT} ` +
          '-f docker/compose.yml logs neon-proxy` y que el puerto esté libre.'
      : `El proxy de Neon respondió ${lastStatus} a la consulta de prueba. Revisa los logs de neon-proxy y que la URL ` +
          `de .env.docker.local use el host ${LOCAL_DATABASE_HOST}.`,
  );
};

/**
 * Ejecuta SQL dentro del contenedor con psql. `ON_ERROR_STOP` detiene en el primer error.
 * `vars` se pasa como `-v clave=valor` (en el SQL: :'clave'), sin interpolar texto a mano.
 * `singleTransaction` envuelve todo el archivo en una transacción (todo o nada).
 */
export const psql = (sqlText, { vars = {}, tuples = false, singleTransaction = false } = {}) => {
  const args = [
    'exec', '-T', 'db', 'psql', '-U', 'postgres', '-d', DB_NAME,
    '-X', '-q', '-v', 'ON_ERROR_STOP=1',
    ...Object.entries(vars).flatMap(([key, value]) => ['-v', `${key}=${value}`]),
    ...(tuples ? ['-A', '-t'] : []),
    ...(singleTransaction ? ['-1'] : []),
    '-f', '-',
  ];
  const result = spawnSync('docker', composeArgs(args), {
    cwd: ROOT,
    input: sqlText,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) fail('No se pudo ejecutar docker. ¿Está instalado y en el PATH?');
  return result;
};

export const psqlOrFail = (sqlText, label, options) => {
  const result = psql(sqlText, options);
  if (result.status !== 0) {
    console.error(`Falló: ${label}.`);
    console.error((result.stderr || '').trim());
    process.exit(1);
  }
  return (result.stdout || '').trim();
};

export const readEnvOrFail = () => {
  ensureEnvFile();
  const env = parseEnvFile();
  assertDockerUrl(databaseUrlFrom(env));
  return env;
};

/** Agrega las credenciales de prueba a `.env.docker.local` si faltan. Devuelve el contenido leído. */
export const ensureTestCredentials = () => {
  ensureEnvFile();
  const env = parseEnvFile();
  const additions = [];
  if (!env.TEST_USER_EMAIL) additions.push(`TEST_USER_EMAIL=prueba@ejemplo.test`);
  if (!env.TEST_USER_PASSWORD) additions.push(`TEST_USER_PASSWORD=${randomSecret(18)}`);
  if (additions.length > 0) {
    const content = readFileSync(ENV_FILE, 'utf8');
    const separator = content.endsWith('\n') ? '' : '\n';
    appendFileSync(ENV_FILE, `${separator}${additions.join('\n')}\n`, 'utf8');
    log('Credenciales de prueba generadas en .env.docker.local.');
  }
  return parseEnvFile();
};
