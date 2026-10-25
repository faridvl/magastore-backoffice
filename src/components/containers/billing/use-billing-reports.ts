import { useRouter } from 'next/router';
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

const MONTH_QUERY_KEY = 'month';
const YEAR_QUERY_KEY = 'year';
const FIRST_MONTH = 1;
const LAST_MONTH = 12;
const FIRST_VALID_YEAR = 2020;

const singleQueryValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? undefined : value;

export function useBillingReports() {
  const router = useRouter();
  // El mes por defecto es el de Costa Rica y no el del equipo del operador:
  // con la maquina en otra zona, el filtro podia abrir en el mes equivocado.
  const [currentYearStr, currentMonth] = currentMonthKey().split('-');
  const currentYear = Number(currentYearStr);

  // Mes y año viven en la URL; uno inválido o fuera de rango cae al mes actual.
  const rawMonth = Number(singleQueryValue(router.query[MONTH_QUERY_KEY]));
  const rawYear = Number(singleQueryValue(router.query[YEAR_QUERY_KEY]));
  const isMonthValid = Number.isInteger(rawMonth) && rawMonth >= FIRST_MONTH && rawMonth <= LAST_MONTH;
  const isYearValid = Number.isInteger(rawYear) && rawYear >= FIRST_VALID_YEAR && rawYear <= currentYear;
  const selectedYear = isYearValid ? rawYear : currentYear;
  const selectedMonth = isMonthValid ? String(rawMonth).padStart(2, '0') : currentMonth;

  const from = `${selectedYear}-${selectedMonth}-01`;
  const to = lastDayOfMonth(selectedYear, Number(selectedMonth));

  const applyMonthFilter = (year: number, month: string) => {
    const query = { ...router.query, [MONTH_QUERY_KEY]: month, [YEAR_QUERY_KEY]: String(year) };
    void router.replace({ pathname: router.pathname, query }, undefined, { shallow: true });
  };

  const { useQuery } = useBillingReportsQuery(from, to);
  const { data, isLoading, isError: isReportError, refetch: refetchReport } = useQuery({ enabled: router.isReady });

  const rows: BillingMonthlyReport[] = data?.data ?? [];

  // Participación de Farid: la tabla muestra el historial completo, porque el
  // reparto se liquida mes a mes y hay que ver los meses anteriores para saber
  // cuáles quedaron pendientes de pago.
  const { useQuery: useShareQuery } = useProfitShareQuery();
  const {
    data: shareData, isLoading: isLoadingShare, isError: isShareError, refetch: refetchShare,
  } = useShareQuery();
  const shareRows: ProfitShareMonthlyReport[] = shareData?.data ?? [];

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
    selectedYear, selectedMonth, applyMonthFilter,
    rows,
    isLoading,
    isReportError,
    refetchReport,
    shareRows,
    isLoadingShare,
    isShareError,
    refetchShare,
    togglePeriodPaid,
    isMarkingPaid,
  };
}
