import * as yup from 'yup';
import { validateIdCard } from './customer-masks';

/**
 * Esquema compartido por el alta y la edición de clientes. Las reglas de cédula
 * dependen del tipo seleccionado, así que se resuelven con `test` sobre el
 * valor hermano en vez de un `matches` fijo.
 */
export const customerIdentitySchema = yup.object({
  first_name: yup
    .string()
    .trim()
    .required('El nombre es obligatorio')
    .max(80, 'El nombre no puede pasar de 80 caracteres'),
  last_name: yup
    .string()
    .trim()
    .required('Los apellidos son obligatorios')
    .max(80, 'Los apellidos no pueden pasar de 80 caracteres'),
  id_type: yup
    .string()
    .oneOf(['FISICA', 'JURIDICA', 'DIMEX', 'PASAPORTE'], 'Tipo de identificación inválido')
    .required('El tipo de identificación es obligatorio'),
  id_card: yup
    .string()
    .trim()
    .required('El número de cédula es obligatorio')
    .test('id-card-format', function (value) {
      const error = validateIdCard(value ?? '', this.parent.id_type);
      return error ? this.createError({ message: error }) : true;
    }),
  email: yup
    .string()
    .trim()
    .required('El correo es obligatorio')
    .email('Ingresa un correo válido'),
  phone: yup
    .string()
    .trim()
    .required('El teléfono es obligatorio')
    // La máscara produce "+506 8888-1234"; se valida sobre los dígitos para no
    // atarse al formato visual.
    .test('phone-digits', 'Ingresa un teléfono válido (+506 XXXX-XXXX)', (value) => {
      const digits = (value ?? '').replace(/\D/g, '');
      const local = digits.startsWith('506') ? digits.slice(3) : digits;
      return local.length === 8;
    }),
});

export type CustomerIdentityForm = yup.InferType<typeof customerIdentitySchema>;
