/**
 * Zona horaria del negocio.
 *
 * La base de datos corre en UTC y los servidores de despliegue también, pero
 * la operación es costarricense (UTC-6, sin horario de verano). Sin convertir,
 * todo lo que ocurre entre las 18:00 y la medianoche hora local queda guardado
 * con la fecha del día siguiente: una factura pagada el 31 de agosto a las 8pm
 * se ve —y se agrupa— como del 1 de septiembre.
 *
 * El instante en sí siempre se guarda bien (las columnas son `timestamptz`).
 * Lo que hay que convertir es cualquier lectura que reduzca ese instante a un
 * día, un mes o un texto para el operador.
 */
export const BUSINESS_TIMEZONE = 'America/Costa_Rica';

/**
 * Fecha en formato corto (dd/mm/aaaa) en hora de Costa Rica.
 *
 * Sustituye a `new Date(x).toLocaleDateString('es-CR')`, que usa la zona del
 * entorno donde corre: correcta en la máquina de un operador en San José,
 * pero desplazada un día cuando el render ocurre en el servidor (UTC).
 */
export const formatBusinessDate = (
  value: string | Date | null | undefined,
): string => {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString('es-CR', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

/** Igual que `formatBusinessDate` pero incluyendo la hora local. */
export const formatBusinessDateTime = (
  value: string | Date | null | undefined,
): string => {
  if (!value) return '—';

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleString('es-CR', {
    timeZone: BUSINESS_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Etiquetas de mes en español. `TO_CHAR` en Postgres las devuelve en inglés
 * salvo que se configure un locale en la base, así que la traducción vive acá.
 */
const MONTH_LABELS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Dic',
];

/** Convierte una clave `YYYY-MM` en su etiqueta corta de mes. */
export const monthLabelEs = (yyyyMm: string): string => {
  const month = Number(yyyyMm.split('-')[1]);
  return MONTH_LABELS_ES[month - 1] ?? yyyyMm;
};

/** Mes en curso en hora de Costa Rica, como clave `YYYY-MM`. */
export const currentMonthKey = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: BUSINESS_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === 'year')?.value ?? '';
  const month = parts.find((p) => p.type === 'month')?.value ?? '';
  return `${year}-${month}`;
};
