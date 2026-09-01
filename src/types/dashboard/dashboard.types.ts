export interface RecentPackage {
  uuid: string;
  tracking_number: string;
  status: string;
  customer_name: string;
  total_amount_crc: number | null;
  created_at: string;
}

export interface RevenueByMonth {
  /** Etiqueta corta del mes, ya en español. */
  month: string;
  /** Clave `YYYY-MM` en hora de Costa Rica, para localizar el mes actual. */
  monthKey: string;
  revenue: number;
}

export interface TopCustomer {
  name: string;
  total: number;
}

export interface DashboardStats {
  packagesThisMonth: number;
  pendingBillingCRC: number;
  activeCustomers: number;
  /** Clientes dados de alta dentro del mes en curso (hora de Costa Rica). */
  newCustomersThisMonth: number;
  /** Cobrado en el mes en curso. Es 0 si todavía no se cobró nada. */
  revenueThisMonthCRC: number;
  recentPackages: RecentPackage[];
  revenueByMonth: RevenueByMonth[];
  topCustomers: TopCustomer[];
}
