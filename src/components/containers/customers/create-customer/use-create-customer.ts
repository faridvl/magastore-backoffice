import { useState } from 'react';
import { useCreateCustomerMutation } from '@/shared/api/mutations/customers/use-create-customer-mutation';
import { useNavigation } from '@/hooks/use-navigation';

export const useCreateCustomer = () => {
  const { admin } = useNavigation();
  const { executeCreate, isPending } = useCreateCustomerMutation();

  // Estado para controlar la visibilidad de la alerta
  const [showSuccess, setShowSuccess] = useState(false);

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idCard: '',
    idType: 'FISICA',
    email: '',
    phone: '',
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // MAPEANDO AL FORMATO DEL API (snake_case)
    const payload = {
      id_card: formData.idCard,
      id_type: formData.idType,
      first_name: formData.firstName,
      last_name: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      addresses: addresses.map(({ id, ...rest }) => rest), // Quitamos el ID temporal
    };

    try {
      await executeCreate(payload);

      setShowSuccess(true);
      setTimeout(() => {
        admin.customers.list(); // Usamos tu hook de navegación
      }, 2000);
    } catch (err) {
      console.error('Error creando cliente:', err);
    }
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
    showSuccess,
    setShowSuccess,
  };
};
