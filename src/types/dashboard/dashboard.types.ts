export interface RecentPackage {
  uuid: string;
  tracking_number: string;
  status: string;
  customer_name: string;
  total_amount_crc: number | null;
  created_at: string;
}

export interface RevenueByMonth {
  month: string;
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
  recentPackages: RecentPackage[];
  revenueByMonth: RevenueByMonth[];
  topCustomers: TopCustomer[];
}
