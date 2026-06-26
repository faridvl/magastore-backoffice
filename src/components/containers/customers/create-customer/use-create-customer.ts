import { useState } from 'react';
import { toast } from 'sonner';
import { useCreateCustomerMutation } from '@/shared/api/mutations/customers/use-create-customer-mutation';
import { useNavigation } from '@/hooks/use-navigation';

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
  };

  const removeAddress = (id: string) => {
    if (addresses.length > 1) {
      setAddresses((prev) => prev.filter((a) => a.id !== id));
    }
  };

  const handleAddressChange = (id: string, field: string, value: string | boolean) => {
    setAddresses((prev) => prev.map((a) => (a.id === id ? { ...a, [field]: value } : a)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

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
      onError: (err: any) => {
        toast.error('No se pudo registrar el cliente. Verifica que el correo y la cédula no estén ya registrados.');
      },
    });
  };

  return {
    formData,
    addresses,
    handleInputChange,
    addAddressField,
    removeAddress,
    handleAddressChange,
    handleSubmit,
    isPending,
  };
};
