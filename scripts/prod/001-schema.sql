-- ============================================================
-- Magastore — Schema completo (generado por introspección)
-- Fecha: 2026-07-17
-- Aplicar sobre una base de datos vacía.
-- ============================================================

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Sequences
CREATE SEQUENCE IF NOT EXISTS billing_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS billing_invoice_number_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS consolidations_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS courier_rates_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS customer_warehouse_codes_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS customers_customer_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS delivery_rates_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS package_events_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS packages_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS pre_billing_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS users_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;
CREATE SEQUENCE IF NOT EXISTS warehouse_routes_id_seq START WITH 1 INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 CACHE 1;

-- Tabla: billing
CREATE TABLE billing (
    id bigint DEFAULT nextval('billing_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT gen_random_uuid(),
    package_id bigint,
    consolidation_id bigint,
    applied_rate_usd numeric(10,2) NOT NULL,
    applied_exchange numeric(10,2) NOT NULL,
    applied_fee_crc numeric(10,2) NOT NULL,
    total_weight_charged numeric(10,2) NOT NULL,
    total_amount_crc numeric(10,2) NOT NULL,
    is_paid boolean DEFAULT false,
    paid_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    delivery_method character varying(20),
    delivery_fee_crc numeric(10,2) DEFAULT 0,
    delivery_address_snapshot text,
    invoice_number integer DEFAULT nextval('billing_invoice_number_seq'::regclass) NOT NULL
);

-- Tabla: consolidations
CREATE TABLE consolidations (
    id bigint DEFAULT nextval('consolidations_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL,
    status text DEFAULT 'ABIERTO'::text,
    total_weight_lb numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    delivery_address_id uuid,
    delivery_method text
);

-- Tabla: courier_rates
CREATE TABLE courier_rates (
    id integer DEFAULT nextval('courier_rates_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT uuid_generate_v4() NOT NULL,
    name text NOT NULL,
    origin text NOT NULL,
    package_type text NOT NULL,
    rate_usd numeric(10,4) NOT NULL,
    insurance_usd numeric(10,4) DEFAULT 0 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla: customer_addresses
CREATE TABLE customer_addresses (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    customer_id uuid,
    province text NOT NULL,
    canton text NOT NULL,
    district text NOT NULL,
    exact_address text NOT NULL,
    is_default boolean DEFAULT false,
    address_label text DEFAULT 'Casa'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now())
);

-- Tabla: customer_warehouse_codes
CREATE TABLE customer_warehouse_codes (
    id integer DEFAULT nextval('customer_warehouse_codes_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT gen_random_uuid(),
    customer_id uuid NOT NULL,
    warehouse_route_id integer NOT NULL,
    code text NOT NULL,
    assigned_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla: customers
CREATE TABLE customers (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    user_uuid uuid,
    id_card text NOT NULL,
    id_type text DEFAULT 'FISICA'::text,
    first_name text NOT NULL,
    last_name text NOT NULL,
    email text NOT NULL,
    phone text,
    customer_code text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    customer_id integer DEFAULT nextval('customers_customer_id_seq'::regclass) NOT NULL
);

-- Tabla: delivery_rates
CREATE TABLE delivery_rates (
    id integer DEFAULT nextval('delivery_rates_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT gen_random_uuid(),
    delivery_method text NOT NULL,
    zone text,
    min_weight_kg numeric NOT NULL,
    max_weight_kg numeric NOT NULL,
    fee_crc numeric NOT NULL,
    cost_crc numeric,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Tabla: package_events
CREATE TABLE package_events (
    id bigint DEFAULT nextval('package_events_id_seq'::regclass) NOT NULL,
    package_id bigint,
    status text NOT NULL,
    event_type text DEFAULT 'INFO'::text,
    description text,
    location text,
    created_at timestamp with time zone DEFAULT now()
);

-- Tabla: packages
CREATE TABLE packages (
    id bigint DEFAULT nextval('packages_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT gen_random_uuid(),
    consolidation_id bigint,
    customer_id uuid NOT NULL,
    tracking_number text NOT NULL,
    weight_lb numeric(10,2) DEFAULT 0 NOT NULL,
    package_type text DEFAULT 'Aereo'::text,
    status text DEFAULT 'MIAMI'::text,
    internal_notes text,
    evidence_url text,
    arrival_date timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    address_id uuid,
    courier_cost_usd numeric(10,2) DEFAULT NULL::numeric,
    tc_banco numeric(10,4) DEFAULT NULL::numeric,
    insurance_applied boolean DEFAULT true NOT NULL,
    courier_rate_id integer,
    store_name text,
    notified_at timestamp with time zone
);

-- Tabla: pre_billing
CREATE TABLE pre_billing (
    id integer DEFAULT nextval('pre_billing_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT uuid_generate_v4() NOT NULL,
    consolidation_id integer NOT NULL,
    estimated_amount_crc numeric(12,2) NOT NULL,
    delivery_method text,
    delivery_fee_crc numeric(12,2) DEFAULT 0 NOT NULL,
    delivery_cost_crc numeric(12,2),
    applied_rate_usd numeric(10,4) NOT NULL,
    applied_exchange numeric(10,4) NOT NULL,
    total_weight_charged numeric(10,2) NOT NULL,
    is_confirmed boolean DEFAULT false NOT NULL,
    confirmed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    notified_at timestamp with time zone
);

-- Tabla: settings_history
CREATE TABLE settings_history (
    id uuid DEFAULT uuid_generate_v4() NOT NULL,
    parameter_name text NOT NULL,
    old_value numeric(10,2),
    new_value numeric(10,2),
    changed_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    changed_by_name text DEFAULT 'Admin'::text
);

-- Tabla: system_settings
CREATE TABLE system_settings (
    id uuid DEFAULT '00000000-0000-0000-0000-000000000000'::uuid NOT NULL,
    price_per_lb numeric(10,2) DEFAULT 6.0 NOT NULL,
    exchange_rate numeric(10,2) DEFAULT 520.0 NOT NULL,
    min_weight numeric(10,2) DEFAULT 1.0 NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
    updated_by uuid,
    correos_fee_crc numeric(10,2) DEFAULT 4500,
    tracopa_fee_crc numeric(10,2) DEFAULT 3000,
    courier_rate_usd numeric(10,4) DEFAULT 2.30 NOT NULL,
    courier_insurance_usd numeric(10,4) DEFAULT 0.50 NOT NULL,
    kg_per_lb numeric DEFAULT 0.453592 NOT NULL
);

-- Tabla: users
CREATE TABLE users (
    id integer DEFAULT nextval('users_id_seq'::regclass) NOT NULL,
    name character varying(100) NOT NULL,
    email character varying(150) NOT NULL,
    password text NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    role character varying(20) DEFAULT 'ADMIN'::character varying NOT NULL
);

-- Tabla: warehouse_routes
CREATE TABLE warehouse_routes (
    id integer DEFAULT nextval('warehouse_routes_id_seq'::regclass) NOT NULL,
    uuid uuid DEFAULT gen_random_uuid(),
    origin text NOT NULL,
    package_type text NOT NULL,
    code_prefix text NOT NULL,
    current_counter integer DEFAULT 0 NOT NULL,
    address_line text,
    city text,
    state text,
    postal_code text,
    contact_phone text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Constraints (PK, UNIQUE, CHECK, FK)
ALTER TABLE billing ADD CONSTRAINT billing_pkey PRIMARY KEY (id);
ALTER TABLE consolidations ADD CONSTRAINT consolidations_pkey PRIMARY KEY (id);
ALTER TABLE courier_rates ADD CONSTRAINT courier_rates_pkey PRIMARY KEY (id);
ALTER TABLE customer_addresses ADD CONSTRAINT customer_addresses_pkey PRIMARY KEY (id);
ALTER TABLE customer_warehouse_codes ADD CONSTRAINT customer_warehouse_codes_pkey PRIMARY KEY (id);
ALTER TABLE customers ADD CONSTRAINT customers_pkey PRIMARY KEY (id);
ALTER TABLE delivery_rates ADD CONSTRAINT delivery_rates_pkey PRIMARY KEY (id);
ALTER TABLE package_events ADD CONSTRAINT package_events_pkey PRIMARY KEY (id);
ALTER TABLE packages ADD CONSTRAINT packages_pkey PRIMARY KEY (id);
ALTER TABLE pre_billing ADD CONSTRAINT pre_billing_pkey PRIMARY KEY (id);
ALTER TABLE settings_history ADD CONSTRAINT settings_history_pkey PRIMARY KEY (id);
ALTER TABLE system_settings ADD CONSTRAINT system_settings_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE warehouse_routes ADD CONSTRAINT warehouse_routes_pkey PRIMARY KEY (id);
ALTER TABLE billing ADD CONSTRAINT billing_uuid_key UNIQUE (uuid);
ALTER TABLE billing ADD CONSTRAINT billing_invoice_number_key UNIQUE (invoice_number);
ALTER TABLE consolidations ADD CONSTRAINT consolidations_uuid_key UNIQUE (uuid);
ALTER TABLE courier_rates ADD CONSTRAINT courier_rates_uuid_key UNIQUE (uuid);
ALTER TABLE customer_warehouse_codes ADD CONSTRAINT customer_warehouse_codes_uuid_key UNIQUE (uuid);
ALTER TABLE customer_warehouse_codes ADD CONSTRAINT customer_warehouse_codes_warehouse_route_id_code_key UNIQUE (warehouse_route_id, code);
ALTER TABLE customers ADD CONSTRAINT customers_customer_code_key UNIQUE (customer_code);
ALTER TABLE customers ADD CONSTRAINT customers_email_key UNIQUE (email);
ALTER TABLE customers ADD CONSTRAINT customers_id_card_key UNIQUE (id_card);
ALTER TABLE customers ADD CONSTRAINT customers_user_uuid_key UNIQUE (user_uuid);
ALTER TABLE delivery_rates ADD CONSTRAINT delivery_rates_uuid_key UNIQUE (uuid);
ALTER TABLE packages ADD CONSTRAINT packages_uuid_key UNIQUE (uuid);
ALTER TABLE pre_billing ADD CONSTRAINT pre_billing_uuid_key UNIQUE (uuid);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE warehouse_routes ADD CONSTRAINT warehouse_routes_origin_package_type_key UNIQUE (origin, package_type);
ALTER TABLE warehouse_routes ADD CONSTRAINT warehouse_routes_uuid_key UNIQUE (uuid);
ALTER TABLE billing ADD CONSTRAINT billing_target_check CHECK ((((package_id IS NOT NULL) AND (consolidation_id IS NULL)) OR ((package_id IS NULL) AND (consolidation_id IS NOT NULL))));
ALTER TABLE consolidations ADD CONSTRAINT consolidations_status_check CHECK ((status = ANY (ARRAY['ABIERTO'::text, 'CERRADO'::text, 'DESPACHADO'::text, 'ENTREGADO'::text])));
ALTER TABLE courier_rates ADD CONSTRAINT courier_rates_package_type_check CHECK ((package_type = ANY (ARRAY['AEREO'::text, 'MARITIMO'::text])));
ALTER TABLE customers ADD CONSTRAINT customers_id_type_check CHECK ((id_type = ANY (ARRAY['FISICA'::text, 'JURIDICA'::text, 'DIMEX'::text, 'PASAPORTE'::text])));
ALTER TABLE packages ADD CONSTRAINT packages_status_check CHECK ((status = ANY (ARRAY['PANAMA'::text, 'BODEGA_CR'::text, 'EN_TRAMITE'::text, 'DESPACHADO'::text, 'ENTREGADO'::text])));
ALTER TABLE billing ADD CONSTRAINT billing_consolidation_id_fkey FOREIGN KEY (consolidation_id) REFERENCES consolidations(id) ON DELETE CASCADE;
ALTER TABLE billing ADD CONSTRAINT billing_package_id_fkey FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;
ALTER TABLE consolidations ADD CONSTRAINT consolidations_delivery_address_id_fkey FOREIGN KEY (delivery_address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL;
ALTER TABLE customer_addresses ADD CONSTRAINT customer_addresses_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE customer_warehouse_codes ADD CONSTRAINT customer_warehouse_codes_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;
ALTER TABLE customer_warehouse_codes ADD CONSTRAINT customer_warehouse_codes_warehouse_route_id_fkey FOREIGN KEY (warehouse_route_id) REFERENCES warehouse_routes(id);
ALTER TABLE package_events ADD CONSTRAINT package_events_package_id_fkey FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE;
ALTER TABLE packages ADD CONSTRAINT packages_address_id_fkey FOREIGN KEY (address_id) REFERENCES customer_addresses(id) ON DELETE SET NULL;
ALTER TABLE packages ADD CONSTRAINT packages_consolidation_id_fkey FOREIGN KEY (consolidation_id) REFERENCES consolidations(id) ON DELETE SET NULL;
ALTER TABLE packages ADD CONSTRAINT packages_courier_rate_id_fkey FOREIGN KEY (courier_rate_id) REFERENCES courier_rates(id);
ALTER TABLE pre_billing ADD CONSTRAINT pre_billing_consolidation_id_fkey FOREIGN KEY (consolidation_id) REFERENCES consolidations(id);

-- Ownership de sequences
ALTER SEQUENCE billing_id_seq OWNED BY billing.id;
ALTER SEQUENCE billing_invoice_number_seq OWNED BY billing.invoice_number;
ALTER SEQUENCE consolidations_id_seq OWNED BY consolidations.id;
ALTER SEQUENCE courier_rates_id_seq OWNED BY courier_rates.id;
ALTER SEQUENCE customer_warehouse_codes_id_seq OWNED BY customer_warehouse_codes.id;
ALTER SEQUENCE customers_customer_id_seq OWNED BY customers.customer_id;
ALTER SEQUENCE delivery_rates_id_seq OWNED BY delivery_rates.id;
ALTER SEQUENCE package_events_id_seq OWNED BY package_events.id;
ALTER SEQUENCE packages_id_seq OWNED BY packages.id;
ALTER SEQUENCE pre_billing_id_seq OWNED BY pre_billing.id;
ALTER SEQUENCE users_id_seq OWNED BY users.id;
ALTER SEQUENCE warehouse_routes_id_seq OWNED BY warehouse_routes.id;

-- Índices
CREATE INDEX idx_events_package ON public.package_events USING btree (package_id);
CREATE INDEX idx_packages_customer ON public.packages USING btree (customer_id);
CREATE INDEX idx_packages_tracking ON public.packages USING btree (tracking_number);
CREATE UNIQUE INDEX packages_tracking_number_key ON public.packages USING btree (tracking_number);

-- Funciones
CREATE OR REPLACE FUNCTION public.fn_log_package_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    -- Solo insertar si el status cambió o es nuevo
    IF (TG_OP = 'INSERT' OR NEW.status <> OLD.status) THEN
        INSERT INTO package_events (package_id, status, description, location, event_type)
        VALUES (
            NEW.id, 
            NEW.status, 
            'El paquete se encuentra en estado: ' || NEW.status,
            CASE 
                WHEN NEW.status = 'MIAMI' THEN 'Miami Warehouse, FL'
                WHEN NEW.status = 'BODEGA_CR' THEN 'Bodega San José, CR'
                WHEN NEW.status = 'ADUANA' THEN 'Aduana Costa Rica'
                ELSE 'Centro de Distribución'
            END,
            'INFO'
        );
    END IF;
    RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.fn_package_status_history()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO package_events (package_id, status, event_type, description, location)
    VALUES (NEW.id, NEW.status, 'INFO', NEW.internal_notes, NULL);
  END IF;
  RETURN NEW;
END;
$function$
;

-- Triggers
CREATE TRIGGER trg_package_status_history AFTER UPDATE OF status ON public.packages FOR EACH ROW EXECUTE FUNCTION fn_package_status_history();
