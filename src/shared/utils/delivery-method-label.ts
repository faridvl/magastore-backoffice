import { DeliveryMethodEntity } from '@/types/logistics/logistics.types';

/** Resuelve el name editable del método por su code; cae al code si no se encontró
 * (método eliminado o la query de delivery-methods aún no cargó). */
export function resolveDeliveryMethodLabel(
  code: string | null | undefined,
  methods: DeliveryMethodEntity[] | undefined,
): string {
  if (!code) return '';
  return methods?.find((m) => m.code === code)?.name ?? code;
}
