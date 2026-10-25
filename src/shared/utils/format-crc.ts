const THOUSANDS_SEPARATOR = '.';

// Formateador propio: toLocaleString('es-CR') separa miles con un espacio duro
// (₡24 500) y varía según el motor; el negocio escribe ₡24.500.
export const formatCrc = (amount: number): string => {
  const rounded = Math.round(amount);
  const digits = Math.abs(rounded).toString().replace(/\B(?=(\d{3})+(?!\d))/g, THOUSANDS_SEPARATOR);
  return `${rounded < 0 ? '-' : ''}₡${digits}`;
};
