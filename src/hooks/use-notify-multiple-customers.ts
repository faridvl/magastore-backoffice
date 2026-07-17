import { useState } from 'react';
import { toast } from 'sonner';
import { ApiServiceClient } from '@/shared/api/api-service-client';
import { env } from '@/shared/api/config';
import { buildWhatsAppUrl, buildPackagesAvailableMessage } from '@/shared/constants/whatsapp-templates';
import { AvailablePackage, CustomerWithAvailablePackages } from '@/types/logistics/logistics.types';

/**
 * Modal de notificación de "paquetes disponibles" para todos los clientes con
 * al menos un paquete sin orden — independiente de cualquier selección de
 * paquetes en la tabla de Logística.
 *
 * Envío por botón individual, no por lote automático: Safari/iPad (uso
 * principal de este sistema) solo permite abrir una pestaña por gesto directo
 * del usuario, incluso llamando window.open() de forma síncrona. Abrir varias
 * pestañas con un solo click no es viable ahí, así que cada cliente tiene su
 * propio botón "Enviar" — cada toque es su propio gesto de usuario y nunca
 * se bloquea.
 */
export function useNotifyMultipleCustomers() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [customers, setCustomers] = useState<CustomerWithAvailablePackages[]>([]);
  const [sentCustomerIds, setSentCustomerIds] = useState<string[]>([]);
  const [sendingCustomerId, setSendingCustomerId] = useState<string | null>(null);

  const open = async () => {
    setIsOpen(true);
    setSentCustomerIds([]);
    setIsLoading(true);
    try {
      const { data } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: CustomerWithAvailablePackages[] }>('/consolidations?customersWithAvailablePackages=1');
      setCustomers(data);
    } catch {
      toast.error('No se pudo cargar la lista de clientes con paquetes disponibles.');
    } finally {
      setIsLoading(false);
    }
  };

  const close = () => {
    setIsOpen(false);
    setCustomers([]);
    setSentCustomerIds([]);
  };

  const sendToCustomer = async (customerId: string) => {
    const customer = customers.find((c) => c.customer_id === customerId);
    if (!customer) return;
    if (!customer.phone) {
      toast.error(`${customer.first_name} ${customer.last_name} no tiene teléfono registrado.`);
      return;
    }

    setSendingCustomerId(customerId);
    try {
      const { data: packages } = await ApiServiceClient(env.API.BASE_URL)
        .get<{ data: AvailablePackage[] }>(`/consolidations?availablePackages=${customerId}`);
      if (packages.length === 0) {
        toast.error(`${customer.first_name} ${customer.last_name} ya no tiene paquetes disponibles.`);
        return;
      }

      const message = buildPackagesAvailableMessage({
        firstName: customer.first_name,
        packages: packages.map((p: AvailablePackage) => ({
          storeName: p.store_name,
          trackingNumber: p.tracking_number,
          weightLb: Number(p.weight_lb),
        })),
      });

      window.open(buildWhatsAppUrl(customer.phone, message), '_blank');

      await ApiServiceClient(env.API.BASE_URL).post('/logistics?action=log-notified', {
        packageUuids: packages.map((p: AvailablePackage) => p.uuid),
      });

      setSentCustomerIds((prev) => [...prev, customerId]);
      // Reflejar de inmediato el estado persistido: todos sus paquetes
      // disponibles quedaron notificados.
      setCustomers((prev) =>
        prev.map((c) => (c.customer_id === customerId ? { ...c, unnotified_count: 0 } : c)),
      );
    } catch (err: any) {
      toast.error(err?.message ?? 'No se pudo preparar la notificación de WhatsApp.');
    } finally {
      setSendingCustomerId(null);
    }
  };

  return {
    isOpen,
    open,
    close,
    isLoading,
    customers,
    sentCustomerIds,
    sendingCustomerId,
    sendToCustomer,
  };
}
