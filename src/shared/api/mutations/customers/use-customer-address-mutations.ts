import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiServiceClient } from '../../api-service-client';
import { env } from '../../config';
import { CustomerAddress, CustomerAddressUpdateInput } from '@/types/customer/customer.types';

/**
 * Alta/edición/borrado de una sola dirección, sin pasar por el update completo
 * del cliente. Invalida el perfil y la lista de direcciones: ambos pintan
 * direcciones y quedarían desincronizados si solo se refrescara uno.
 */
export function useCustomerAddressMutations(customerId: string) {
  const queryClient = useQueryClient();

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
    await queryClient.invalidateQueries({ queryKey: ['customer-addresses', customerId] });
  };

  const saveMutation = useMutation<{ data: CustomerAddress[] }, Error, CustomerAddressUpdateInput>({
    mutationFn: (address) =>
      ApiServiceClient(env.API.BASE_URL).put(`/customers/${customerId}/addresses`, address),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation<{ data: CustomerAddress[] }, Error, string>({
    mutationFn: (addressId) =>
      ApiServiceClient(env.API.BASE_URL).delete(
        `/customers/${customerId}/addresses?addressId=${addressId}`,
      ),
    onSuccess: invalidate,
  });

  return {
    saveAddress: saveMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    deleteAddress: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
  };
}
