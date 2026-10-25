const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha real en formato AAAA-MM-DD: "2026-02-30" no pasa. */
export const isIsoDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !ISO_DATE_PATTERN.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};
