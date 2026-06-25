export enum PackageStatus {
  MIAMI = 'MIAMI',
  TRANSITO = 'TRANSITO',
  ADUANA = 'ADUANA',
  BODEGA_CR = 'BODEGA_CR',
  ENTREGADO = 'ENTREGADO',
}

export enum ConsolidationStatus {
  ABIERTO = 'ABIERTO',
  CERRADO = 'CERRADO',
  DESPACHADO = 'DESPACHADO',
  ENTREGADO = 'ENTREGADO',
}

export type EventType = 'INFO' | 'WARNING' | 'DAMAGE' | 'CRITICAL';

// --- Interfaces de Base de Datos ---

export interface Package {
  id: number;
  uuid: string;
  consolidation_id: number | null;
  customer_id: string;
  tracking_number: string;
  weight_lb: number;
  package_type: string;
  status: PackageStatus;
  internal_notes: string | null;
  evidence_url: string | null;
  arrival_date: Date;
  created_at: Date;
  updated_at: Date;
  // Propiedad virtual para el join de eventos
  events?: PackageEvent[];
}

export interface PackageEvent {
  id: number;
  package_id: number;
  status: string;
  event_type: EventType;
  description: string;
  location: string;
  created_at: Date;
}

export interface Consolidation {
  id: number;
  uuid: string;
  customer_id: string;
  status: ConsolidationStatus;
  total_weight_lb: number;
  created_at: Date;
  updated_at: Date;
}

export interface Billing {
  id: number;
  uuid: string;
  package_id: number | null;
  consolidation_id: number | null;
  applied_rate_usd: number;
  applied_exchange: number;
  applied_fee_crc: number;
  total_weight_charged: number;
  total_amount_crc: number;
  is_paid: boolean;
  paid_at: Date | null;
  created_at: Date;
}

// --- Inputs para Mutaciones ---

export interface PackageInput {
  customer_id: string;
  tracking_number: string;
  weight_lb: number;
  package_type?: string;
}

export interface IncidenceInput {
  status: PackageStatus;
  note?: string;
  evidenceUrl?: string;
}

export interface LogisticsPackage {
  id: string;
  uuid: string;
  consolidation_id: string | null;
  customer_id: string;
  tracking_number: string;
  weight_lb: string;
  package_type: string;
  status: 'MIAMI' | 'TRANSITO' | 'ADUANA' | 'BODEGA_CR' | 'ENTREGADO';
  internal_notes: string | null;
  evidence_url: string | null;
  arrival_date: string;
  created_at: string;
  // Campos del Join con Clientes
  first_name: string | null;
  last_name: string | null;
  customer_code: string | null;
}

// export type PackageEvent = {
//   id: number;
//   package_id: number;
//   status: string;
//   event_type: 'INFO' | 'WARNING' | 'ALERT';
//   description: string;
//   location: string;
//   created_at: string;
// };

export type PackageDetail = {
  uuid: string;
  tracking_number: string;
  status: string;
  weight_lb: string;
  internal_notes: string | null;
  evidence_url: string | null;
  events: PackageEvent[];
};
