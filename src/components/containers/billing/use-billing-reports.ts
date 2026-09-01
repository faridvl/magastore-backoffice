import { useState } from 'react';
import { toast } from 'sonner';
import { useBillingReportsQuery } from '@/shared/api/querys/billing/use-billing-reports-query';
import { useProfitShareQuery } from '@/shared/api/querys/billing/use-profit-share-query';
import { useMarkProfitSharePaidMutation } from '@/shared/api/mutations/billing/use-mark-profit-share-paid-mutation';
import { BillingMonthlyReport, ProfitShareMonthlyReport } from '@/types/logistics/logistics.types';
import { currentMonthKey } from '@/shared/utils/timezone';

// Último día del mes en formato YYYY-MM-DD, usando fecha local (evita el
// corrimiento de un día que da new Date(y, m, 0).toISOString() en huso UTC-6).
function lastDayOfMonth(year: number, month: number): string {
  const day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function useBillingReports() {
  // Por defecto se filtra el mes y año actuales completos. El rango libre
  // Desde/Hasta queda oculto en la UI por ahora, pero el estado se conserva
  // para no tener que tocar las queries si se vuelve a exponer más adelante.
  // El mes por defecto es el de Costa Rica y no el del equipo del operador:
  // con la maquina en otra zona, el filtro podia abrir en el mes equivocado.
  const [currentYearStr, currentMonth] = currentMonthKey().split('-');
  const currentYear = Number(currentYearStr);

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonth);
  const [from, setFrom] = useState(`${currentYear}-${currentMonth}-01`);
  const [to,   setTo]   = useState(lastDayOfMonth(currentYear, Number(currentMonth)));

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

  // Participación de Farid: la tabla muestra el historial completo, porque el
  // reparto se liquida mes a mes y hay que ver los meses anteriores para saber
  // cuáles quedaron pendientes de pago.
  const { useQuery: useShareQuery } = useProfitShareQuery();
  const { data: shareData, isLoading: isLoadingShare } = useShareQuery();
  const shareRows: ProfitShareMonthlyReport[] = shareData?.data ?? [];

  // Las tarjetas del resumen, en cambio, hablan del mes filtrado: se recorta el
  // historial a ese rango. Mezclar ambos universos hacía que "Para Farid"
  // mostrara el acumulado de todos los meses junto a un pendiente de uno solo,
  // y que la utilidad neta restara participación de meses ajenos al filtro.
  const fromPeriod = from.slice(0, 7);
  const toPeriod = to.slice(0, 7);
  const shareRowsInRange = shareRows.filter(
    (r) => r.period >= fromPeriod && r.period <= toPeriod,
  );

  const { markPeriodPaid, isPending: isMarkingPaid } = useMarkProfitSharePaidMutation();

  const togglePeriodPaid = async (period: string, isPaid: boolean) => {
    try {
      await markPeriodPaid({ period, isPaid });
      toast.success(
        isPaid
          ? 'Período marcado como pagado a Farid'
          : 'Se revirtió el pago del período',
      );
    } catch {
      toast.error('No se pudo actualizar el estado de pago. Intenta de nuevo.');
    }
  };

  return {
    from, setFrom: setFromManual,
    to,   setTo: setToManual,
    selectedYear, selectedMonth, applyMonthFilter,
    rows,
    isLoading,
    shareRows,
    shareRowsInRange,
    isLoadingShare,
    togglePeriodPaid,
    isMarkingPaid,
  };
}
