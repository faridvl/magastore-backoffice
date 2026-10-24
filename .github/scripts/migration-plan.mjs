/**
 * Reglas puras del flujo de migraciones: sin red ni disco, para poder probarlas sin base.
 * Los mensajes nunca incluyen valores de conexión (el repo es público y los logs también).
 */

const MIGRATION_PATTERN = /^(\d+)-.+\.sql$/;

export const versionOf = (name) => name.match(MIGRATION_PATTERN)?.[1] ?? null;

// Neon usa `ep-xxx-pooler.region...` con pool y `ep-xxx.region...` sin pool: es la misma base.
export const normalizeHost = (host) => {
  const [first, ...rest] = String(host).trim().toLowerCase().split('.');
  return [first.replace(/-pooler$/, ''), ...rest].join('.');
};

export const checkTarget = ({ databaseUrl, expectedHost, expectedName, environmentName }) => {
  const errors = [];
  const where = (kind) => `GitHub → Settings → Environments → ${environmentName} → ${kind}`;

  if (!databaseUrl) {
    errors.push(`Falta el secreto DATABASE_URL. Configúralo en ${where('Environment secrets')}.`);
  }
  if (!expectedHost) {
    errors.push(
      `Falta la variable EXPECTED_DATABASE_HOST. Configúrala en ${where('Environment variables')}.`,
    );
  }
  if (!expectedName) {
    errors.push(
      `Falta la variable EXPECTED_DATABASE_NAME. Configúrala en ${where('Environment variables')}.`,
    );
  }
  if (errors.length > 0 || !databaseUrl) return errors;

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    return ['DATABASE_URL no es una URL válida.'];
  }

  if (normalizeHost(parsed.hostname) !== normalizeHost(expectedHost)) {
    errors.push('El servidor de DATABASE_URL no coincide con EXPECTED_DATABASE_HOST.');
  }
  let name = '';
  try {
    name = decodeURIComponent(parsed.pathname.replace(/^\//, ''));
  } catch {
    name = '';
  }
  if (name !== expectedName) {
    errors.push('La base de DATABASE_URL no coincide con EXPECTED_DATABASE_NAME.');
  }
  return errors;
};

/**
 * migrations: [{ name, version, ... }]; appliedNames: Iterable<string>;
 * appliedChecksums: Map<name, checksum | null>; checksumOf: (migration) => string.
 */
export const computePlan = ({ migrations, appliedNames, appliedChecksums, checksumOf }) => {
  const errors = [];
  const warnings = [];
  const applied = new Set(appliedNames);

  const byNumber = new Map();
  for (const migration of migrations) {
    const number = Number(migration.version);
    byNumber.set(number, [...(byNumber.get(number) ?? []), migration.name]);
  }
  for (const [number, names] of byNumber) {
    if (names.length > 1) {
      errors.push(`Hay varios archivos con el número ${number}: ${names.join(', ')}.`);
    }
  }

  const pending = migrations
    .filter((migration) => !applied.has(migration.name))
    .sort((a, b) => Number(a.version) - Number(b.version) || a.name.localeCompare(b.name));

  const appliedNumbers = [...applied].map((name) => Number(versionOf(name))).filter(Number.isFinite);
  const highestApplied = appliedNumbers.length > 0 ? Math.max(...appliedNumbers) : null;
  if (highestApplied !== null) {
    for (const migration of pending) {
      if (Number(migration.version) <= highestApplied) {
        errors.push(
          `${migration.name} está pendiente pero ya hay aplicadas migraciones de número mayor o igual ` +
            `(${String(highestApplied).padStart(3, '0')}): orden incorrecto, renumérala.`,
        );
      }
    }
  }

  const files = new Map(migrations.map((migration) => [migration.name, migration]));
  for (const name of applied) {
    const migration = files.get(name);
    if (!migration) {
      warnings.push(`${name} figura como aplicada pero ya no existe como archivo.`);
      continue;
    }
    const recorded = appliedChecksums?.get(name);
    if (recorded && recorded !== checksumOf(migration)) {
      warnings.push(`${name} ya estaba aplicada y su archivo cambió desde entonces.`);
    }
  }

  return { pending, warnings, errors };
};

const SHORT_SHA_LENGTH = 7;

export const formatConfirmation = (version, commitSha) =>
  `${version}@${String(commitSha ?? '').slice(0, SHORT_SHA_LENGTH)}`;

export const checkConfirmation = ({ pending, confirm, expectedPending, commitSha }) => {
  const errors = [];
  if (pending.length === 0) return errors;

  const lastVersion = pending[pending.length - 1].version;
  const example = formatConfirmation(lastVersion, commitSha || '1a2b3c4');
  const format = `Usa el formato <versión>@<sha de ${SHORT_SHA_LENGTH} caracteres>, ej. ${example}.`;
  const confirmText = String(confirm ?? '').trim();

  if (!confirmText.includes('@')) {
    errors.push(`confirmar debe incluir la versión y el commit separados por "@". ${format}`);
  } else {
    const [versionText, shaText = ''] = confirmText.split('@');
    if (!/^\d+$/.test(versionText) || Number(versionText) !== Number(lastVersion)) {
      errors.push(`confirmar no coincide con la última migración del plan: ${lastVersion}.`);
    }
    if (!/^[0-9a-f]+$/i.test(shaText) || shaText.length < SHORT_SHA_LENGTH) {
      errors.push(
        `el commit de confirmar debe tener al menos ${SHORT_SHA_LENGTH} caracteres hexadecimales. ${format}`,
      );
    } else if (!commitSha) {
      errors.push('no se pudo determinar el commit que se está ejecutando (falta COMMIT_SHA).');
    } else if (!commitSha.toLowerCase().startsWith(shaText.toLowerCase())) {
      errors.push(
        'estás aplicando un commit distinto del que revisaste. Vuelve a lanzar el plan y confirma con el texto nuevo.',
      );
    }
  }

  const current = pending.map((migration) => migration.name);
  const reviewed = expectedPending ?? [];
  if (current.length !== reviewed.length || current.some((name, index) => name !== reviewed[index])) {
    errors.push(
      'el plan cambió desde que lo revisaste. ' +
        `Ahora pendientes: ${current.join(', ')}. Revisado: ${reviewed.length > 0 ? reviewed.join(', ') : '(nada)'}.`,
    );
  }
  return errors;
};

const columnProbe = (table, column) =>
  `SELECT 1 FROM information_schema.columns
   WHERE table_schema = 'public' AND table_name = '${table}' AND column_name = '${column}'`;
const templateProbe = (code) => `SELECT 1 FROM whatsapp_templates WHERE code = '${code}'`;

// Solo se usan al tomar el punto de partida del ledger: detectan una base que ya
// tiene la migración aunque el ledger diga que falta (p. ej. aplicada con dbmigrate
// sin schema_migrations). La 036 no tiene sonda propia: depende de las anteriores.
export const BASELINE_PROBES = {
  '028-address-confirmation-template.sql': templateProbe('ADDRESS_CONFIRMATION'),
  '029-address-request-template.sql': templateProbe('ADDRESS_REQUEST'),
  '030-consolidation-current-step.sql': columnProbe('consolidations', 'current_step'),
  '031-shipment-requested-customer-template.sql': templateProbe('SHIPMENT_REQUESTED_CUSTOMER'),
  '032-shipment-requested-unpaid-template.sql': templateProbe('SHIPMENT_REQUESTED_CUSTOMER_UNPAID'),
  '033-billing-payment-authorship.sql': columnProbe('billing', 'payment_method'),
  '034-post-delivery-follow-up.sql': columnProbe('consolidations', 'follow_up_sent_at'),
  '035-customer-recipients.sql': `SELECT 1 WHERE to_regclass('public.customer_recipients') IS NOT NULL`,
};
