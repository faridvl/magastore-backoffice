import { useState } from 'react';
import { useBillingReportsQuery } from '@/shared/api/querys/billing/use-billing-reports-query';
import { BillingMonthlyReport } from '@/types/logistics/logistics.types';

function getDefaultRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to   = now.toISOString().slice(0, 10);
  return { from, to };
}

// Último día del mes en formato YYYY-MM-DD, usando fecha local (evita el
// corrimiento de un día que da new Date(y, m, 0).toISOString() en huso UTC-6).
function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function useBillingReports() {
  const defaults = getDefaultRange();
  const [from, setFrom] = useState(defaults.from);
  const [to,   setTo]   = useState(defaults.to);

  // Selector de mes/año: atajo que setea from/to al rango completo de ese mes.
  // '' = no hay mes seleccionado (se está usando el rango Desde/Hasta libre).
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  const applyMonthFilter = (year: number, month: string) => {
    setSelectedYear(year);
    setSelectedMonth(month);
    if (month === '') return;
    const m = Number(month);
    setFrom(`${year}-${month}-01`);
    setTo(lastDayOfMonth(year, m));
  };

  const setFromManual = (v: string) => { setSelectedMonth(''); setFrom(v); };
  const setToManual = (v: string) => { setSelectedMonth(''); setTo(v); };

  const { useQuery } = useBillingReportsQuery(from, to);
  const { data, isLoading } = useQuery();

  const rows: BillingMonthlyReport[] = data?.data ?? [];

  return {
    from, setFrom: setFromManual,
    to,   setTo: setToManual,
    selectedYear, selectedMonth, applyMonthFilter,
    rows,
    isLoading,
  };
}
