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

export enum PackageType {
  AEREO = 'AEREO',
  MARITIMO = 'MARITIMO',
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
  package_type: PackageType;
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

export type DeliveryMethod = 'CORREOS_CR' | 'TRACOPA' | 'RETIRO';

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
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
}

// --- Inputs para Mutaciones ---

export interface PackageInput {
  customer_id: string;
  tracking_number: string;
  weight_lb: number;
  package_type?: PackageType;
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
  package_type: PackageType;
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

export type PackageDetail = {
  uuid: string;
  tracking_number: string;
  status: string;
  weight_lb: string;
  internal_notes: string | null;
  evidence_url: string | null;
  events: PackageEvent[];
  first_name: string | null;
  last_name: string | null;
  customer_code: string | null;
  is_paid: boolean | null;
  paid_at: string | null;
  total_amount_crc: number | null;
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number | null;
};

// --- Tipos para Billing ---

export interface BillingListItem {
  uuid: string;
  consolidation_uuid: string;
  customer_name: string;
  customer_code: string;
  total_weight_charged: number;
  applied_rate_usd: number;
  applied_exchange: number;
  total_amount_crc: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
}

export interface BillingDetail {
  uuid: string;
  consolidation_uuid: string;
  consolidation_status: ConsolidationStatus;
  customer_name: string;
  customer_code: string;
  customer_email: string;
  total_weight_lb: number;
  total_weight_charged: number;
  applied_rate_usd: number;
  applied_exchange: number;
  total_amount_crc: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  package_trackings: string[];
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
  delivery_address_snapshot: string | null;
}

export interface PendingConsolidation {
  uuid: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  total_weight_lb: number;
  package_count: number;
  status: ConsolidationStatus;
  created_at: string;
}

export interface GenerateInvoiceInput {
  consolidationUuid: string;
  deliveryMethod: DeliveryMethod;
}

export interface BillingMonthlyReport {
  month: string;
  total_invoiced_crc: number;
  total_paid_crc: number;
  total_pending_crc: number;
  invoice_count: number;
  paid_count: number;
}

export interface MarkPaidInput {
  billingUuid: string;
}

// --- Tipos para Consolidaciones (gestión) ---

export interface ConsolidationListItem {
  uuid: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  status: ConsolidationStatus;
  total_weight_lb: number;
  package_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConsolidationPackage {
  uuid: string;
  tracking_number: string;
  weight_lb: number;
  package_type: PackageType;
  status: PackageStatus;
  arrival_date: string;
}

export interface ConsolidationDetail {
  uuid: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_email: string;
  status: ConsolidationStatus;
  total_weight_lb: number;
  created_at: string;
  updated_at: string;
  packages: ConsolidationPackage[];
}

export interface AvailablePackage {
  uuid: string;
  tracking_number: string;
  weight_lb: number;
  package_type: PackageType;
  status: PackageStatus;
  arrival_date: string;
}

export interface CreateConsolidationInput {
  customerUuid: string;
}

export interface UpdateConsolidationStatusInput {
  consolidationUuid: string;
  status: ConsolidationStatus;
}

export interface AssignPackagesToConsolidationInput {
  consolidationUuid: string;
  packageUuids: string[];
}
