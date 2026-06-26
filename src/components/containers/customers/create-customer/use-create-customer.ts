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
    setFormData((prev) => ({ ...prev, [name]: value }));
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
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.firstName.trim()) newErrors.firstName = 'El nombre es obligatorio';
    if (!formData.lastName.trim()) newErrors.lastName = 'Los apellidos son obligatorios';
    if (!formData.idCard.trim()) newErrors.idCard = 'El número de cédula es obligatorio';
    if (!formData.email.trim()) {
      newErrors.email = 'El correo es obligatorio';
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = 'Ingresa un correo válido';
    }
    if (!formData.phone.trim()) newErrors.phone = 'El teléfono es obligatorio';
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
