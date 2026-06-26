import { useState } from 'react';
import { useBillingReportsQuery } from '@/shared/api/querys/billing/use-billing-reports-query';
import { BillingMonthlyReport } from '@/types/logistics/logistics.types';

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  return { from, to };
}

export function useBillingReports() {
  const defaults = getDefaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to,   setTo]   = useState(defaults.to);

  const { useQuery } = useBillingReportsQuery(from, to);
  const { data, isLoading } = useQuery();

  const rows: BillingMonthlyReport[] = data?.data ?? [];

  return {
    from, setFrom,
    to,   setTo,
    rows,
    isLoading,
  };
}
