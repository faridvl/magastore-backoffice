import { useState } from 'react';
import { useRouter } from 'next/router';
import { useLoginMutation } from '@/shared/api/mutations/auth/use-login-mutation';

export const useLogin = () => {
  const router = useRouter();

  // Aquí obtenemos la función executeLogin del hook que ya creaste
  const { executeLogin, isPending } = useLoginMutation();
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (formData: any) => {
    setError(null);
    try {
      await executeLogin(formData);
    } catch (err) {
      setError('Credenciales inválidas. Por favor, revisa tus datos.');
    }
  };

  return {
    handleLogin,
    loading: isPending, // Mapeamos isPending a loading para el componente
    error,
  };
};
