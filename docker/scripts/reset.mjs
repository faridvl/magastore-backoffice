/**
 * Borra el volumen de Docker y rehace la base desde cero.
 *
 *   node docker/scripts/reset.mjs --to-027   deja la base como producción hoy (ensayo del pase)
 *   node docker/scripts/reset.mjs            027 -> 028..036 -> escenarios -> usuario de prueba
 *
 * El usuario de prueba también se crea en --to-027: la migración 033 se niega a
 * correr sin al menos un usuario, igual que en producción.
 */
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import {
  ROOT, assertDockerUrl, compose, composeOrFail, databaseUrlFrom, ensureEnvFile, fail, log,
  parseEnvFile,
} from './lib.mjs';

const isTo027 = process.argv.includes('--to-027');

ensureEnvFile();
assertDockerUrl(databaseUrlFrom(parseEnvFile()));

const runScript = (name, label, args = []) => {
  const result = spawnSync(process.execPath, [join(ROOT, 'docker', 'scripts', name), ...args], {
    cwd: ROOT,
    stdio: 'inherit',
  });
  if (result.status !== 0) fail(`Falló: ${label}.`);
};

log('Borrando contenedores y volumen local...');
compose(['down', '-v', '--remove-orphans']);
composeOrFail(['up', '-d', '--wait'], 'levantar los contenedores');

runScript('create-base-027.mjs', 'crear la base en 027');
runScript('test-user.mjs', 'crear el usuario de prueba');

if (isTo027) {
  log('Listo: base en 027, sin migraciones ni escenarios. Siguiente: npm run docker:migrate:plan');
} else {
  runScript('migrate.mjs', 'migrar de 028 a 036');
  runScript('seed.mjs', 'sembrar los escenarios');
  log('Listo: base en 036 con los escenarios de prueba.');
}
