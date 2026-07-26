import * as yup from 'yup';
import { PackageType } from '@/types/logistics/logistics.types';
import { isValidUsPhone } from './courier-rate-masks';

/**
 * Esquema del formulario de courier + casillero. Reemplaza al recorrido manual
 * `findMissingField`, que solo reportaba el primer campo vacío en un toast: con
 * yup el operador ve todos los errores a la vez, cada uno junto a su campo.
 *
 * El servicio (`courier-rates.service.ts`) sigue validando lo mismo del lado del
 * servidor — esto no lo reemplaza, evita el viaje.
 */
export const courierRateSchema = yup.object({
  name: yup
    .string()
    .trim()
    .required('El nombre del courier es obligatorio')
    .max(60, 'El nombre no puede pasar de 60 caracteres'),
  origin: yup
    .string()
    .trim()
    .required('El origen es obligatorio')
    .max(40, 'El origen no puede pasar de 40 caracteres'),
  package_type: yup
    .string()
    .oneOf(Object.values(PackageType), 'Tipo de paquete inválido')
    .required('El tipo de paquete es obligatorio'),
  rate_usd: yup
    .string()
    .trim()
    .required('La tarifa por libra es obligatoria')
    .test('rate-positive', 'La tarifa por libra debe ser mayor a 0', (value) => Number(value) > 0),
  // El seguro sí puede ser 0 (un courier sin seguro incluido), pero nunca
  // negativo: restaría del costo real del paquete.
  insurance_usd: yup
    .string()
    .trim()
    .test('insurance-not-negative', 'El seguro no puede ser negativo', (value) => {
      if (!value) return true; // vacío se normaliza a 0 al guardar
      return Number(value) >= 0;
    }),
  /**
   * El prefijo identifica al casillero dentro del código que ve el cliente
   * (ej. MGA-2453-C-07). Se exige que termine en un separador para que el
   * número quede legible: sin él, "MGA2453C" + "07" produce "MGA2453C07".
   */
  code_prefix: yup
    .string()
    .trim()
    .required('El prefijo de código es obligatorio')
    .max(20, 'El prefijo no puede pasar de 20 caracteres')
    .matches(/^[A-Z0-9-]+$/, 'El prefijo solo admite letras, números y guiones')
    .matches(/-$/, 'El prefijo debe terminar en guion (ej. MGA-2453-C-)'),
  address_line: yup
    .string()
    .trim()
    .required('La dirección del casillero es obligatoria')
    .max(120, 'La dirección no puede pasar de 120 caracteres'),
  city: yup.string().trim().required('La ciudad es obligatoria').max(60, 'La ciudad no puede pasar de 60 caracteres'),
  state: yup
    .string()
    .trim()
    .required('El estado/provincia es obligatorio')
    .max(60, 'El estado no puede pasar de 60 caracteres'),
  // ZIP de EE. UU.: 5 dígitos o ZIP+4. Los casilleros están en Florida, no en
  // Costa Rica, así que el formato postal es el americano.
  postal_code: yup
    .string()
    .trim()
    .required('El código postal es obligatorio')
    .matches(/^\d{5}(-\d{4})?$/, 'Código postal inválido (33172 o 33172-1615)'),
  contact_phone: yup
    .string()
    .trim()
    .required('El teléfono de contacto es obligatorio')
    // La máscara produce "+1 786-360-2816"; se valida sobre los dígitos para no
    // atarse al formato visual.
    // Se reutiliza el criterio de la máscara en vez de repetir el conteo de
    // dígitos: si ambos lados divergen, un valor puede verse bien formateado en
    // pantalla y aun así ser rechazado al guardar.
    .test('us-phone-digits', 'Ingresa un teléfono válido (+1 XXX-XXX-XXXX)', (value) =>
      isValidUsPhone(value ?? ''),
    ),
});

export type CourierRateFormErrors = Partial<Record<string, string>>;

/**
 * Valida el draft completo y devuelve los errores por campo. Se usa `abortEarly:
 * false` a propósito: el operador debe ver todo lo que falta de una vez, no
 * corregir de a un campo por intento de guardado.
 */
export async function validateCourierRateDraft(draft: unknown): Promise<CourierRateFormErrors> {
  try {
    await courierRateSchema.validate(draft, { abortEarly: false });
    return {};
  } catch (err) {
    if (err instanceof yup.ValidationError) {
      const errors: CourierRateFormErrors = {};
      for (const issue of err.inner) {
        // Solo el primer error de cada campo: mostrar dos mensajes bajo el
        // mismo input confunde más de lo que ayuda.
        if (issue.path && !errors[issue.path]) errors[issue.path] = issue.message;
      }
      return errors;
    }
    throw err;
  }
}
