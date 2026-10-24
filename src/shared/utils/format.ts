const THOUSANDS_SEPARATOR = '.';
const DECIMAL_SEPARATOR = ',';
const WEIGHT_UNIT = 'lb';
const WEIGHT_MAX_DECIMALS = 2;
const EMPTY_VALUE = '—';

/**
 * Peso en libras con coma decimal y, como mucho, dos decimales: "3 lb", "25,5 lb", "7,35 lb".
 * Acepta string porque las columnas numeric de Postgres llegan como texto.
 */
export const formatWeight = (lb: number | string | null | undefined): string => {
  if (lb === null || lb === undefined || lb === '') return EMPTY_VALUE;

  const value = Number(lb);
  if (!Number.isFinite(value)) return EMPTY_VALUE;

  const [integerPart, decimalPart] = value.toFixed(WEIGHT_MAX_DECIMALS).split('.');
  const integerWithSeparators = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  const decimals = (decimalPart ?? '').replace(/0+$/, '');

  return `${integerWithSeparators}${decimals ? `${DECIMAL_SEPARATOR}${decimals}` : ''} ${WEIGHT_UNIT}`;
};

/** Cantidad con su sustantivo en singular o plural: "1 paquete", "2 paquetes". */
export const formatCount = (count: number | string, singular: string, plural: string): string => {
  const value = Number(count);
  return `${value} ${value === 1 ? singular : plural}`;
};
