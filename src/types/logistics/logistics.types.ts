export enum PackageStatus {
  PANAMA = 'PANAMA',
  EN_TRAMITE = 'EN_TRAMITE',
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

export interface CourierRate {
  id: number;
  uuid: string;
  name: string;
  origin: string;
  package_type: PackageType;
  rate_usd: number;
  insurance_usd: number;
  is_active: boolean;
  /** Viene preseleccionado al registrar un paquete. Solo uno puede serlo. */
  is_default: boolean;
  created_at: Date;
  /**
   * Ruta de casillero de esta tarifa (misma clave natural origin+package_type).
   * Null si el courier todavía no tiene casillero configurado. Solo lo trae el
   * listado de logistics — el mantenimiento usa CourierRateWithWarehouse.
   */
  warehouse_route_id?: number | null;
}

export interface CourierRateInput {
  name: string;
  origin: string;
  package_type: PackageType;
  rate_usd: number;
  insurance_usd: number;
  // Datos del casillero de esta ruta (warehouse_routes) — se administran junto
  // con la tarifa porque un courier nuevo implica un casillero y un prefijo de
  // código nuevos para sus clientes.
  code_prefix: string;
  address_line: string;
  city: string;
  state: string;
  postal_code: string;
  contact_phone: string;
}

/** Tarifa de courier con los datos de su casillero, para el mantenimiento. */
export interface CourierRateWithWarehouse extends CourierRate {
  code_prefix: string | null;
  current_counter: number | null;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  contact_phone: string | null;
}

export type DeliveryZone = 'GAM' | 'RESTO';

export interface DeliveryRate {
  id: number;
  uuid: string;
  delivery_method: DeliveryMethod;
  zone: DeliveryZone | null;
  min_weight_kg: number;
  max_weight_kg: number;
  fee_crc: number;
  cost_crc: number | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryRateInput {
  delivery_method: DeliveryMethod;
  zone: DeliveryZone | null;
  min_weight_kg: number;
  max_weight_kg: number;
  fee_crc: number;
  cost_crc: number | null;
}

export interface PreBilling {
  id: number;
  uuid: string;
  consolidation_id: number;
  estimated_amount_crc: number;
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
  applied_rate_usd: number;
  applied_exchange: number;
  total_weight_charged: number;
  is_confirmed: boolean;
  confirmed_at: Date | null;
  created_at: Date;
  updated_at: Date;
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
  courier_cost_usd: number | null;
  tc_banco: number | null;
  insurance_applied: boolean;
  courier_rate_id: number | null;
  store_name: string | null;
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
  delivery_method: DeliveryMethod | null;
  created_at: Date;
  updated_at: Date;
}

// Deja de ser union type fijo: el catálogo real vive en delivery_methods (código
// estable, editable en /admin/delivery-methods). El string sigue siendo el mismo
// code guardado como snapshot en pre_billing/billing, así que el tipo se mantiene
// como string para no romper esos snapshots ni el resto del código que lo trata
// como valor de texto.
export type DeliveryMethod = string;

export interface DeliveryMethodEntity {
  id: number;
  uuid: string;
  code: string;
  name: string;
  requires_zone: boolean;
  is_pickup: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DeliveryMethodInput {
  code: string;
  name: string;
  requires_zone: boolean;
  is_pickup: boolean;
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
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
  courier_cost_crc: number | null;
  delivery_cost_crc: number | null;
  profit_crc: number | null;
  has_unknown_cost: boolean;
}

// --- Inputs para Mutaciones ---

export interface PackageInput {
  customer_id: string;
  tracking_number: string;
  weight_lb: number;
  package_type?: PackageType;
  status?: PackageStatus;
  address_id?: string | null;
  courier_cost_usd: number;
  tc_banco: number;
  insurance_applied?: boolean;
  courier_rate_id?: number | null;
  store_name?: string | null;
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
  status: 'PANAMA' | 'EN_TRAMITE' | 'ENTREGADO';
  internal_notes: string | null;
  evidence_url: string | null;
  arrival_date: string;
  created_at: string;
  // Campos del Join con Clientes
  first_name: string | null;
  last_name: string | null;
  customer_code: string | null;
  // Campos del Join con Órdenes de Envío
  consolidation_uuid: string | null;
  consolidation_status: ConsolidationStatus | null;
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
  courier_rate_name: string | null;
  courier_rate_usd: number | null;
  courier_insurance_usd: number | null;
  tc_banco: number | null;
  applied_rate_usd: number | null;
  applied_exchange: number | null;
  total_weight_charged: number | null;
  applied_fee_crc: number | null;
  // Regla de cobro congelada en la factura (ver BillingDetail).
  applied_billing_mode: string | null;
  applied_discount_percent: number | null;
};

// --- Tipos para Billing ---

export interface BillingListItem {
  uuid: string;
  // Correlativo legible (F-0001) para identificar la factura al hablar con
  // el cliente — el uuid no es práctico para eso.
  invoice_number: number;
  consolidation_uuid: string;
  consolidation_status: ConsolidationStatus;
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

export interface BillingPackageLine {
  tracking_number: string;
  weight_lb: number;
}

export interface BillingDetail {
  uuid: string;
  invoice_number: number;
  consolidation_uuid: string;
  consolidation_status: ConsolidationStatus;
  customer_name: string;
  customer_code: string;
  customer_email: string;
  total_weight_lb: number;
  total_weight_charged: number;
  applied_rate_usd: number;
  applied_exchange: number;
  // Regla de cobro congelada al confirmar la factura. Se lee de aquí y no del
  // tipo actual del cliente: si mañana cambia de tipo, una factura ya emitida
  // debe seguir explicando el monto con el que se emitió.
  applied_billing_mode: string | null;
  applied_discount_percent: number | null;
  total_amount_crc: number;
  is_paid: boolean;
  paid_at: string | null;
  created_at: string;
  packages: BillingPackageLine[];
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
  delivery_address_snapshot: string | null;
  // Dirección de entrega actual de la orden — fallback con zona completa para
  // facturas viejas cuyo snapshot solo guardó la dirección exacta.
  delivery_exact_address: string | null;
  delivery_district: string | null;
  delivery_canton: string | null;
  delivery_province: string | null;
}

export interface GenerateInvoiceInput {
  consolidationUuid: string;
  deliveryMethod: DeliveryMethod;
}

export interface GeneratePreBillingInput {
  consolidationUuid: string;
  deliveryMethod: DeliveryMethod;
}

export interface PreBillingDetail {
  uuid: string;
  consolidation_uuid: string;
  customer_name: string;
  customer_code: string;
  customer_email: string;
  total_weight_lb: number;
  total_weight_charged: number;
  applied_rate_usd: number;
  applied_exchange: number;
  // Regla de cobro con la que se calculó el estimado (ver BillingDetail).
  applied_billing_mode: string | null;
  applied_discount_percent: number | null;
  estimated_amount_crc: number;
  delivery_method: DeliveryMethod | null;
  delivery_fee_crc: number;
  is_confirmed: boolean;
  confirmed_at: string | null;
  created_at: string;
  package_trackings: string[];
}

export interface BillingMonthlyReport {
  month: string;
  total_invoiced_crc: number;
  total_paid_crc: number;
  total_pending_crc: number;
  total_ganancia_crc: number;
  invoice_count: number;
  paid_count: number;
  // Facturas cuyo costo de entrega no se conocía al confirmar (billing.has_unknown_cost) —
  // total_ganancia_crc no las castiga con costo cero, las excluye de ese descuento.
  unknown_cost_count: number;
}

export interface MarkPaidInput {
  billingUuid: string;
}

// --- Participación de Farid sobre la ganancia ---

export enum ProfitShareStatus {
  // Registrado al generar el estimado. Plata proyectada: la orden todavía puede
  // recalcularse o no facturarse nunca.
  ESTIMADO = 'ESTIMADO',
  // La factura fue confirmada. Cifra definitiva y única que cuenta como ingreso.
  FACTURADO = 'FACTURADO',
}

export interface ProfitShareMonthlyReport {
  period: string;
  // Solo filas FACTURADO — es la cifra que se le paga a Farid.
  invoiced_share_crc: number;
  // Solo filas ESTIMADO — órdenes con estimado generado y aún sin facturar.
  estimated_share_crc: number;
  invoiced_profit_crc: number;
  share_percent: number;
  invoiced_count: number;
  estimated_count: number;
  // Órdenes cuyo costo de entrega no se conocía: su ganancia no lo descuenta,
  // así que la participación calculada queda por encima de la real.
  unknown_cost_count: number;
  is_paid: boolean;
  paid_at: string | null;
  paid_by_name: string | null;
  paid_amount_crc: number | null;
}

export interface ProfitSharePackageBreakdown {
  tracking_number: string;
  weight_lb: number;
  revenue_crc: number;
  cost_crc: number;
  profit_crc: number;
  share_crc: number;
}

export interface ProfitShareDetail {
  uuid: string;
  period: string;
  status: ProfitShareStatus;
  revenue_crc: number;
  courier_cost_crc: number;
  delivery_cost_crc: number | null;
  profit_base_crc: number;
  share_percent: number;
  share_crc: number;
  has_unknown_cost: boolean;
  packages: ProfitSharePackageBreakdown[];
}

export interface MarkPeriodPaidInput {
  period: string;
  isPaid: boolean;
}

// --- Tipos para Órdenes de Envío (gestión) ---

export enum ConsolidationPaymentStatus {
  SIN_ESTIMADO = 'SIN_ESTIMADO',
  ESTIMADO_PENDIENTE = 'ESTIMADO_PENDIENTE',
  PENDIENTE_PAGO = 'PENDIENTE_PAGO',
  PAGADO = 'PAGADO',
}

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
  payment_status: ConsolidationPaymentStatus;
  // Monto de la factura si ya existe; si no, el estimado de la prefactura; si no hay ninguno, null.
  display_amount_crc: number | null;
  is_billing_amount: boolean;
}

export interface ConsolidationPackage {
  uuid: string;
  tracking_number: string;
  weight_lb: number;
  package_type: PackageType;
  status: PackageStatus;
  arrival_date: string;
  store_name: string | null;
  courier_cost_usd: number | null;
  tc_banco: number | null;
}

export interface ConsolidationDetail {
  uuid: string;
  customer_id: string;
  customer_name: string;
  customer_code: string;
  customer_email: string;
  customer_phone: string;
  // Regla de cobro del cliente — explica por qué el monto puede diferir de la
  // tarifa de lista (socios al costo, clientes con descuento).
  customer_type_name: string | null;
  customer_type_billing_mode: string | null;
  customer_type_discount_percent: number | null;
  status: ConsolidationStatus;
  total_weight_lb: number;
  created_at: string;
  updated_at: string;
  packages: ConsolidationPackage[];
  pre_billing_uuid: string | null;
  pre_billing_amount: number | null;
  pre_billing_fee_crc: number | null;
  // Snapshot del costo real de entrega al generar el estimado (migración 014).
  // Null en pre-billings viejos o si el cost_crc estaba "por confirmar".
  pre_billing_delivery_cost_crc: number | null;
  pre_billing_delivery_method: DeliveryMethod | null;
  pre_billing_confirmed: boolean | null;
  pre_billing_confirmed_at: string | null;
  pre_billing_notified_at: string | null;
  // Snapshot de tarifas de la prefactura (null si la orden sigue abierta)
  pre_billing_rate_usd: number | null;
  pre_billing_exchange: number | null;
  // Tarifas vigentes de system_settings — fallback para calcular el cobro
  // estimado de la rentabilidad cuando aún no hay prefactura.
  current_price_per_lb: number;
  current_exchange_rate: number;
  current_min_weight: number;
  billing_uuid: string | null;
  billing_is_paid: boolean | null;
  // Ganancia congelada al confirmar la factura (migración 018) — fuente de
  // verdad cuando ya existe factura; no se recalcula si cambian tarifas después.
  billing_total_amount_crc: number | null;
  billing_courier_cost_crc: number | null;
  billing_delivery_cost_crc: number | null;
  billing_profit_crc: number | null;
  billing_has_unknown_cost: boolean | null;
  // Participación de Farid sobre la ganancia de esta orden (migración 023).
  // Null mientras no se haya generado el estimado — se crea recién ahí.
  profit_share_crc: number | null;
  profit_share_percent: number | null;
  profit_share_status: ProfitShareStatus | null;
  delivery_method: DeliveryMethod | null;
  delivery_address_id: string | null;
  delivery_address_label: string | null;
  delivery_exact_address: string | null;
  delivery_district: string | null;
  delivery_canton: string | null;
  delivery_province: string | null;
  // Cantón usado para resolver la zona (dirección de la orden, o la default
  // del cliente si la orden aún no tiene dirección asignada).
  zone_canton: string | null;
  // Enriquecidos en el service con la tarifa vigente de delivery_rates que
  // matchea método/zona/peso — para la rentabilidad. El costo real no se
  // snapshotea: siempre refleja el valor actual de la tabla de tarifas.
  delivery_cost_crc: number | null;
  delivery_fee_estimate_crc: number | null;
}

export interface AvailablePackage {
  uuid: string;
  tracking_number: string;
  weight_lb: number;
  package_type: PackageType;
  status: PackageStatus;
  arrival_date: string;
  store_name: string | null;
}

export interface CustomerWithAvailablePackages {
  customer_id: string;
  first_name: string;
  last_name: string;
  phone: string;
  package_count: number;
  // Paquetes disponibles con notified_at IS NULL — 0 significa que el cliente
  // ya fue notificado de todos sus paquetes actuales.
  unnotified_count: number;
  total_weight_lb: number;
}

export interface CreateConsolidationInput {
  customerUuid: string;
}

export interface CreateConsolidationWithPackagesInput {
  customerUuid: string;
  packageUuids: string[];
  // Requerido solo si el cliente tiene más de una dirección registrada; con una sola
  // dirección el backend la asigna automáticamente sin necesidad de enviarla.
  deliveryAddressId?: string;
  // Elegido junto con la dirección al crear la orden. Opcional por compatibilidad
  // con órdenes viejas; generatePreBilling cae a pedirlo explícito si falta.
  deliveryMethod?: DeliveryMethod;
}

export interface UpdateConsolidationStatusInput {
  consolidationUuid: string;
  status: ConsolidationStatus;
}

export interface AssignPackagesToConsolidationInput {
  consolidationUuid: string;
  packageUuids: string[];
}

export interface UnassignPackageInput {
  packageUuid: string;
}
