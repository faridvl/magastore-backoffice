import { BadgeTone, ORDER_STEP_LABEL, ORDER_STEP_TONE, PACKAGE_STATUS_LABEL, packageStatusLabel, packageStatusTone } from '@/shared/constants/status-labels';
import { ConsolidationStatus, ShipmentOrderStep } from '@/types/logistics/logistics.types';

// Estados que ya no existen en el enum pero siguen guardados en paquetes viejos: se muestran
// legibles para que el operador vea qué tienen y los pueda corregir.
const LEGACY_PACKAGE_STATUS_LABEL: Record<string, string> = {
  BODEGA_CR: 'Bodega Costa Rica (antiguo)',
};

export const describePackageStatus = (status: string): { label: string; tone: BadgeTone } => {
  const isKnown = status in PACKAGE_STATUS_LABEL;
  return {
    label: isKnown ? packageStatusLabel(status) : LEGACY_PACKAGE_STATUS_LABEL[status] ?? status,
    tone: packageStatusTone(status),
  };
};

// El listado de paquetes solo conoce el estado de la orden, no su paso.
export const CONSOLIDATION_STATUS_LABEL: Record<ConsolidationStatus, string> = {
  [ConsolidationStatus.ABIERTO]: 'Abierta',
  [ConsolidationStatus.CERRADO]: 'Cerrada',
  [ConsolidationStatus.DESPACHADO]: 'Despachada',
  [ConsolidationStatus.ENTREGADO]: 'Finalizada',
};

export const CONSOLIDATION_STATUS_TONE: Record<ConsolidationStatus, BadgeTone> = {
  [ConsolidationStatus.ABIERTO]: BadgeTone.WARNING,
  [ConsolidationStatus.CERRADO]: BadgeTone.INFO,
  [ConsolidationStatus.DESPACHADO]: BadgeTone.VIOLET,
  [ConsolidationStatus.ENTREGADO]: BadgeTone.SUCCESS,
};

/** "Orden en Cobro", "Orden finalizada": el paso, con el mismo nombre que ve el operador en Órdenes. */
export const describeOrder = (
  step: ShipmentOrderStep | null | undefined,
  status: ConsolidationStatus | null | undefined,
): { label: string; tone: BadgeTone } | null => {
  const stepNumber = Number(step) as ShipmentOrderStep;
  if (ORDER_STEP_LABEL[stepNumber]) {
    return {
      label:
        stepNumber === ShipmentOrderStep.FINALIZADA
          ? 'Orden finalizada'
          : `Orden en ${ORDER_STEP_LABEL[stepNumber]}`,
      tone: ORDER_STEP_TONE[stepNumber],
    };
  }
  if (status) {
    return { label: `Orden ${CONSOLIDATION_STATUS_LABEL[status].toLowerCase()}`, tone: CONSOLIDATION_STATUS_TONE[status] };
  }
  return null;
};
