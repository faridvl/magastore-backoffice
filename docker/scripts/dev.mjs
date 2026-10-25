/**
 * `next dev` contra la base de Docker, en el puerto 3030 y con su propio directorio
 * de compilación. Se niega si la URL no es la local y no envía correos.
 */
import { spawn } from 'node:child_process';
import { join } from 'node:path';
import {
  DEV_PORT, DISABLED_RESEND_KEY, ROOT, assertDockerUrl, databaseUrlFrom, ensureEnvFile, log, parseEnvFile,
  waitForProxy,
} from './lib.mjs';

ensureEnvFile();
const fileEnv = parseEnvFile();
assertDockerUrl(databaseUrlFrom(fileEnv));
await waitForProxy(databaseUrlFrom(fileEnv));
log(`Abre http://127.0.0.1:${DEV_PORT} (no localhost: las cookies chocarían con el dev de :3001).`);

// Lo definido en process.env gana sobre .env.local (Next solo completa lo que falta),
// así que nada de otra base ni de Resend puede colarse desde ahí.
const env = {
  ...process.env,
  ...fileEnv,
  MAGASTORE_DB_POSTGRES_URL: databaseUrlFrom(fileEnv),
  RESEND_API_KEY: DISABLED_RESEND_KEY,
  NEXT_PUBLIC_API_URL: '/api',
  NEXT_DIST_DIR: '.next-docker',
};

const nextBin = join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next');
const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(DEV_PORT)], {
  cwd: ROOT,
  stdio: 'inherit',
  env,
});
child.on('exit', (code) => process.exit(code ?? 0));
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
