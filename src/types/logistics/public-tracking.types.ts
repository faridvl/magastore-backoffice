/**
 * Tipos del rastreo sin sesión. Viven aparte de `logistics.types.ts` para que la página
 * pública no importe `PackageStatus` y su valor interno no viaje en el bundle.
 */
export enum PublicTrackingStatus {
  RECEIVED = 'RECEIVED',
  /** Ya pidió el envío y todavía no se despacha. */
  PREPARING = 'PREPARING',
  EN_TRAMITE = 'EN_TRAMITE',
  ENTREGADO = 'ENTREGADO',
}

export interface PublicTrackingEvent {
  status: PublicTrackingStatus;
  created_at: string;
}

export interface PublicTrackingResult {
  tracking_number: string;
  status: PublicTrackingStatus;
  weight_lb: number;
  arrival_date: string | null;
  /** Nombre y la inicial del apellido, ej. "María R.". */
  customer_name: string | null;
  events: PublicTrackingEvent[];
}
