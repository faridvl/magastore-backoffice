export interface RecentPackage {
  uuid: string;
  tracking_number: string;
  status: string;
  customer_name: string;
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
  id: string;
  name: string;
  total: number;
}

export interface DashboardStats {
  packagesThisMonth: number;
  weightLbThisMonth: number;
  profitThisMonthCRC: number;
  /** Facturas del mes sin el costo real de entrega: la ganancia queda por encima de la real. */
  unknownCostCountThisMonth: number;
  /** Participación de Farid ya facturada en el mes. */
  faridShareThisMonthCRC: number;
  faridSharePercent: number;
  pendingBillingCRC: number;
  activeCustomers: number;
  /** Clientes dados de alta dentro del mes en curso (hora de Costa Rica). */
  newCustomersThisMonth: number;
  /** Facturado en el mes en curso, por fecha de emisión. 0 si no hay facturas. */
  revenueThisMonthCRC: number;
  recentPackages: RecentPackage[];
  revenueByMonth: RevenueByMonth[];
  topCustomers: TopCustomer[];
}
