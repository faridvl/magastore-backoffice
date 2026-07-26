export type IdType = 'FISICA' | 'JURIDICA' | 'DIMEX' | 'PASAPORTE';

export interface CustomerAddressInput {
  province: string;
  canton: string;
  district: string;
  exact_address: string;
  address_label?: string;
  is_default?: boolean;
}

export interface CustomerAddressUpdateInput {
  id?: string;
  province: string;
  canton: string;
  district: string;
  exact_address: string;
  address_label?: string;
  is_default?: boolean;
}

export interface CustomerInput {
  id_card: string;
  id_type: IdType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  addresses: CustomerAddressInput[];
  /** Código de casillero explícito. Si se omite, se genera el siguiente de la ruta. */
  customer_code?: string | null;
  /**
   * Rutas de casillero (warehouse_routes.id) que se le asignan al cliente al
   * darlo de alta — una por cada courier con el que va a operar. Si llega vacío
   * se usa el courier predeterminado, para que ningún cliente quede sin
   * casillero. El customer_code de la tabla customers es el de la primera.
   */
  warehouse_route_ids?: number[];
  /** Tipo de cliente (regla de cobro). Si se omite, se asigna el NORMAL por defecto. */
  customer_type_id?: number | null;
}

export interface CustomerUpdateInput {
  id_card?: string;
  id_type?: IdType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  customer_type_id?: number | null;
  addresses?: CustomerAddressUpdateInput[];
}

export interface CustomerAddress extends CustomerAddressInput {
  id: string;
  customer_id: string;
  created_at: string;
}

export interface CustomerWarehouseCodeDisplay {
  code: string;
  origin: string;
  package_type: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  contact_phone: string | null;
}

export interface Customer {
  id: string;
  id_card: string;
  id_type: IdType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  customer_code: string;
  is_active: boolean;
  created_at: string;
  addresses: CustomerAddress[];
  warehouse_codes: CustomerWarehouseCodeDisplay[];
  // Tipo de cliente (regla de cobro). Solo lo trae getCustomerById — el listado
  // paginado no hace el JOIN, así que ahí llegan null.
  customer_type_id: number | null;
  customer_type_name: string | null;
  customer_type_billing_mode: CustomerBillingMode | null;
  customer_type_discount_percent: number | null;
}

export interface CustomerImportRow {
  id_card: string;
  id_type: IdType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  customer_code?: string;
  /**
   * Nombres de courier separados por coma, tal como los escribe el operador en
   * la columna `couriers` de la plantilla. El servicio los traduce a
   * warehouse_route_ids; vacío significa "usar el predeterminado".
   */
  couriers?: string;
  /** Resuelto por el servicio a partir de `couriers`. No viene del archivo. */
  warehouse_route_ids?: number[];
  province: string;
  canton: string;
  district: string;
  exact_address: string;
  address_label?: string;
  is_default?: boolean;
}

export interface CustomerImportError {
  id_card: string;
  reason: string;
}

export interface CustomerImportResult {
  inserted: number;
  errors: CustomerImportError[];
}

export interface WarehouseRoute {
  id: number;
  uuid: string;
  origin: string;
  package_type: string;
  code_prefix: string;
  current_counter: number;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
}

export enum CustomerBillingMode {
  /** Precio de lista de system_settings. */
  NORMAL = 'NORMAL',
  /** Flete al costo real del courier, sin margen. La entrega local sí se cobra. */
  AL_COSTO = 'AL_COSTO',
  /** % de descuento sobre el flete. La entrega local no se descuenta. */
  DESCUENTO = 'DESCUENTO',
}

export interface CustomerType {
  id: number;
  uuid: string;
  name: string;
  billing_mode: CustomerBillingMode;
  discount_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomerTypeInput {
  name: string;
  billing_mode: CustomerBillingMode;
  discount_percent: number;
}

export interface WarehouseRouteInput {
  origin: string;
  package_type: string;
  code_prefix: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  contact_phone: string | null;
}

/**
 * Casillero que un cliente tiene en una ruta concreta. Incluye el id de la
 * ruta para poder cruzarlo con las tarifas de courier en el formulario de
 * paquetes.
 */
export interface CustomerWarehouseRoute {
  warehouse_route_id: number;
  code: string;
  origin: string;
  package_type: string;
  address_line: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  contact_phone: string | null;
}

export interface CustomerWarehouseCode {
  id: number;
  uuid: string;
  customer_id: string;
  warehouse_route_id: number;
  code: string;
  assigned_at: string;
}
