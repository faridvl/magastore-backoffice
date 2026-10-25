/**
 * Reglas puras del aviso de migraciones en un PR a main: sin red ni disco.
 * Cuenta como migración solo lo que cuenta migrate.mjs: `scripts/NNN-*.sql` directo en
 * `scripts/` (`scripts/prod/` y los .js no son migraciones numeradas).
 * Los nombres que llegan del PR nunca se imprimen si no cumplen el patrón estricto.
 */

export const COMMENT_MARKER = '<!-- migraciones-pr -->';
export const MAX_LISTED_FILES = 3000;

// Parecido a migrate.mjs (`^(\d+)-.+\.sql$`): decide si un archivo pretende ser una migración.
// `[^/]` admite saltos de línea a propósito, para que un nombre raro no se escape como "otro archivo".
const LOOSE_MIGRATION_PATH = /^scripts\/(\d+)-[^/]*\.sql$/;
// Lo único que se acepta e imprime.
const STRICT_MIGRATION_PATH = /^scripts\/(\d{3})-[A-Za-z0-9._-]+\.sql$/;

const looseVersion = (path) => {
  const match = LOOSE_MIGRATION_PATH.exec(path ?? '');
  return match ? Number(match[1]) : null;
};
const isStrict = (path) => STRICT_MIGRATION_PATH.test(path ?? '');
const baseName = (path) => path.slice(path.lastIndexOf('/') + 1);
const pad = (version, width) => String(version).padStart(width, '0');
const printable = (path) => (isStrict(path) ? baseName(path) : 'una migración de main');

/**
 * @param {string[]} mainFiles nombres de archivo en `scripts/` de main (ej. `027-x.sql`)
 * @param {{ filename: string, status: string, previous_filename?: string }[]} prFiles
 * @param {{ changedFiles?: number }} [options]
 */
export const analyzeMigrations = (mainFiles, prFiles, { changedFiles = prFiles.length } = {}) => {
  const mainMigrations = new Set(
    mainFiles.map((name) => `scripts/${name}`).filter((path) => looseVersion(path) !== null),
  );
  const lastMain = Math.max(0, ...[...mainMigrations].map(looseVersion));
  const errors = [];
  const added = [];
  let invalidCount = 0;

  if (changedFiles > MAX_LISTED_FILES) {
    errors.push(
      `El PR cambia más de ${MAX_LISTED_FILES} archivos y GitHub no los lista todos, así que no se pueden revisar sus migraciones. Divide el PR.`,
    );
  }

  const addCandidate = (path) => {
    if (isStrict(path)) added.push(path);
    else if (looseVersion(path) !== null) invalidCount += 1;
  };

  for (const file of prFiles) {
    const { filename, status, previous_filename: previous } = file;

    if (status === 'added' || status === 'copied') {
      addCandidate(filename);
    } else if (status === 'renamed') {
      if (mainMigrations.has(previous)) {
        errors.push(
          `Se renombró o movió la migración ${printable(previous)}, que ya existe en main.`,
        );
      } else {
        addCandidate(filename);
      }
    } else if (mainMigrations.has(filename)) {
      const verb = status === 'removed' ? 'borra' : 'modifica';
      errors.push(`El PR ${verb} la migración ${printable(filename)}, que ya existe en main.`);
    }
  }

  if (invalidCount > 0) {
    errors.push(
      `Hay ${invalidCount} migración(es) con nombre inválido: deben llamarse scripts/NNN-descripcion.sql (3 dígitos, solo letras, números, punto, guion y guion bajo).`,
    );
  }

  const sorted = added
    .map((path) => ({ name: baseName(path), version: looseVersion(path) }))
    .sort((a, b) => a.version - b.version || a.name.localeCompare(b.name));
  const width = 3;

  let expected = lastMain + 1;
  const seen = new Set();
  for (const { version } of sorted) {
    if (seen.has(version)) {
      errors.push(`La numeración ${pad(version, width)} está repetida en el PR.`);
      continue;
    }
    seen.add(version);
    if (version <= lastMain) {
      errors.push(
        `La migración ${pad(version, width)} no puede usarse: main ya llega a la ${pad(lastMain, width)}. Renumérala desde la ${pad(lastMain + 1, width)}.`,
      );
    } else if (version !== expected) {
      errors.push(
        `Falta la migración ${pad(expected, width)}: la numeración debe ser seguida (llegó la ${pad(version, width)}).`,
      );
      expected = version + 1;
    } else {
      expected += 1;
    }
  }

  return {
    added: sorted.map((item) => item.name),
    versions: sorted.map((item) => item.version),
    lastMain,
    width,
    errors,
    hasErrors: errors.length > 0,
  };
};

export const buildMessage = (analysis) => {
  const { added, versions, width, errors } = analysis;
  const lines = [];

  if (added.length === 0) {
    lines.push('Este PR no trae migraciones.');
  } else {
    const first = pad(versions[0], width);
    const last = pad(versions[versions.length - 1], width);
    lines.push(
      first === last
        ? `Este PR trae la migración ${first}:`
        : `Este PR trae las migraciones ${first} a ${last}:`,
      '',
      ...added.map((name) => `- \`${name}\``),
      '',
      'Al mergear NO se aplican. Mergea fuera del horario del operador y corre de inmediato Actions → Migraciones de producción → Run workflow en main con aplicar ✓ y confirmar = el texto que muestra el plan.',
    );
  }

  if (errors.length > 0) {
    lines.push(
      '',
      '**No mergees este PR hasta corregirlo:**',
      '',
      ...errors.map((error) => `- ${error}`),
      '',
      'Una migración que ya está en main nunca se edita, renombra ni borra: se corrige con una migración nueva. Las nuevas deben numerarse seguidas desde la última de main.',
    );
  }

  return lines.join('\n');
};

// Decide qué hacer con el comentario del PR: crear, actualizar u omitir.
export const planComment = ({ analysis, existingBody, isFork }) => {
  if (isFork) return 'skip';
  if (existingBody !== undefined) return 'update';
  return analysis.added.length > 0 || analysis.hasErrors ? 'create' : 'skip';
};
