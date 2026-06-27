import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateCustomerMutation } from '@/shared/api/mutations/customers/use-create-customer-mutation';
import { useNavigation } from '@/hooks/use-navigation';

interface FormErrors {
  firstName?: string;
  lastName?: string;
  idCard?: string;
  email?: string;
  phone?: string;
  addresses?: string;
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function applyIdMask(value: string, idType: string): string {
  const digits = value.replace(/\D/g, '');
  if (idType === 'FISICA') {
    // 0-0000-0000
    const p1 = digits.slice(0, 1);
    const p2 = digits.slice(1, 5);
    const p3 = digits.slice(5, 9);
    return [p1, p2, p3].filter(Boolean).join('-');
  }
  if (idType === 'JURIDICA') {
    // 0-000-000000
    const p1 = digits.slice(0, 1);
    const p2 = digits.slice(1, 4);
    const p3 = digits.slice(4, 10);
    return [p1, p2, p3].filter(Boolean).join('-');
  }
  // DIMEX y PASAPORTE: libre (DIMEX acepta dígitos, PASAPORTE alfanumérico)
  if (idType === 'DIMEX') return value.replace(/\D/g, '').slice(0, 12);
  return value; // PASAPORTE: alfanumérico libre
}

function validateIdCard(value: string, idType: string): string | undefined {
  const digits = value.replace(/\D/g, '');
  if (idType === 'FISICA' && digits.length !== 9) return 'Cédula física debe tener 9 dígitos (0-0000-0000)';
  if (idType === 'JURIDICA' && digits.length !== 10) return 'Cédula jurídica debe tener 10 dígitos (0-000-000000)';
  if (idType === 'DIMEX' && (digits.length < 11 || digits.length > 12)) return 'DIMEX debe tener 11 o 12 dígitos';
  if (idType === 'PASAPORTE' && value.trim().length < 5) return 'Pasaporte debe tener al menos 5 caracteres';
  return undefined;
}

function applyPhoneMask(value: string): string {
  const digits = value.replace(/\D/g, '');
  // Costa Rica: +506 XXXX-XXXX (8 dígitos locales)
  const local = digits.startsWith('506') ? digits.slice(3) : digits;
  const trimmed = local.slice(0, 8);
  const part1 = trimmed.slice(0, 4);
  const part2 = trimmed.slice(4, 8);
  const formatted = part2 ? `${part1}-${part2}` : part1;
  return formatted ? `+506 ${formatted}` : '';
}

export const useCreateCustomer = () => {
  const { admin } = useNavigation();
  const { execute, isPending } = useCreateCustomerMutation();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idCard: '',
    idType: 'FISICA',
    email: '',
    phone: '',
    tier: 'Regular',
  });

  const [addresses, setAddresses] = useState([
    {
      id: crypto.randomUUID(),
      province: '',
      canton: '',
      district: '',
      exact_address: '',
      address_label: 'Principal',
      is_default: true,
    },
  ]);

  const [errors, setErrors] = useState<FormErrors>({});

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'idCard') {
      const masked = applyIdMask(value, formData.idType);
      setFormData((prev) => ({ ...prev, idCard: masked }));
    } else if (name === 'idType') {
      setFormData((prev) => ({ ...prev, idType: value, idCard: '' }));
    } else if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: applyPhoneMask(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const addAddressField = () => {
    setAddresses((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        province: '',
        canton: '',
        district: '',
        exact_address: '',
        address_label: `Dirección ${prev.length + 1}`,
        is_default: false,
      },
    ]);
    setErrors((prev) => ({ ...prev, addresses: undefined }));
  };

  const removeAddress = (id: string) => {
    if (addresses.length > 1) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleAddressChange = (id: string, field: string, value: string | boolean) => {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) return { ...a, [field]: value };
        if (field === 'is_default' && value === true) return { ...a, is_default: false };
        return a;
      })
    );
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es obligatorio';
    if (!formData.lastName.trim()) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!formData.idCard.trim()) {
      newErrors.idCard = 'El número de cédula es obligatorio';
    } else {
      const idError = validateIdCard(formData.idCard, formData.idType);
      if (idError) newErrors.idCard = idError;
    }
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Ingresa un correo válido';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'El teléfono es obligatorio';
    } else if (formData.phone.replace(/\D/g, '').length < 8) {
      newErrors.phone = 'Ingresa un teléfono válido (+506 XXXX-XXXX)';
    }
    if (addresses.length === 0) newErrors.addresses = 'Debes agregar al menos una dirección de entrega';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    const payload = {
      id_card: formData.idCard,
      id_type: formData.idType,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      addresses: addresses.map(({ id, ...rest }) => rest),
    };

    execute(payload, {
      onSuccess: () => {
        toast.success('Cliente registrado exitosamente');
        admin.customers.list();
      },
      onError: () => {
        toast.error('No se pudo registrar el cliente. Verifica que el correo y la cédula no estén ya registrados.');
      },
    });
  };

  return {
    formData,
    addresses,
    errors,
    handleInputChange,
    addAddressField,
    removeAddress,
    handleAddressChange,
    handleSubmit,
    isPending,
  };
};
