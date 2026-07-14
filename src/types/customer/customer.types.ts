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
}

export interface CustomerUpdateInput {
  id_card?: string;
  id_type?: IdType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  is_active: boolean;
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
}

export interface CustomerImportRow {
  id_card: string;
  id_type: IdType;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  customer_code?: string;
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

export interface CustomerWarehouseCode {
  id: number;
  uuid: string;
  customer_id: string;
  warehouse_route_id: number;
  code: string;
  assigned_at: string;
}
