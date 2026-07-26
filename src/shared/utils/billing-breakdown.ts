import { CustomerBillingMode } from '@/types/customer/customer.types';

export interface BreakdownPackage {
  tracking_number: string;
  weight_lb: number | string;
}

export interface BreakdownLine {
  tracking_number: string;
  weight: number;
  subtotal: number;
}

export interface BillingBreakdown {
  /** Flete efectivamente cobrado, ya con la regla del cliente aplicada. */
  flete: number;
  /** Flete a precio de lista. Igual a `flete` cuando el modo es NORMAL. */
  fleteLista: number;
  /** Rebaja aplicada sobre el flete de lista. 0 si no hubo. */
  descuento: number;
  /** Líneas por paquete; sus subtotales suman exactamente `flete`. */
  lines: BreakdownLine[];
  /**
   * Precio por libra realmente aplicado, o null en AL_COSTO — ahí el cobro sale
   * del costo real del courier y no de una tarifa por peso, así que imprimir un
   * precio/lb sería inventar un dato que no se usó para facturar.
   */
  effectiveRateUsd: number | null;
  isNormal: boolean;
  /** Etiqueta para la línea de ajuste del resumen. Null si el modo es NORMAL. */
  ruleLabel: string | null;
}

/**
 * Desglose de una factura o estimado respetando la regla de cobro del cliente.
 *
 * El total (`amountCrc`) y el cobro de entrega (`deliveryFeeCrc`) vienen de la
 * base: son la fuente de verdad, calculada por generatePreBilling. De ahí se
 * deriva el flete restando la entrega, en vez de recalcularlo con peso × tarifa
 * — así el desglose impreso siempre cuadra con el total, que es justamente lo
 * que fallaba cuando se reconstruía a precio de lista.
 *
 * Los subtotales por paquete se prorratean por peso y el último absorbe el
 * redondeo, para que la columna sume el flete al céntimo.
 */
export const buildBillingBreakdown = (params: {
  packages: BreakdownPackage[];
  amountCrc: number | string;
  deliveryFeeCrc: number | string;
  totalWeightCharged: number | string;
  appliedRateUsd: number | string;
  appliedExchange: number | string;
  billingMode: string | null;
  discountPercent: number | string | null;
}): BillingBreakdown => {
  const mode = params.billingMode ?? CustomerBillingMode.NORMAL;
  const isNormal = mode === CustomerBillingMode.NORMAL;
  const discountPercent = Number(params.discountPercent ?? 0);
  const exchange = Number(params.appliedExchange);
  const chargedWeight = Number(params.totalWeightCharged);

  const flete = Math.max(0, Number(params.amountCrc) - Number(params.deliveryFeeCrc));
  const fleteLista = chargedWeight * Number(params.appliedRateUsd) * exchange;
  const descuento = Math.max(0, fleteLista - flete);

  // En AL_COSTO no hay tarifa por libra detrás del monto; en los demás modos el
  // precio efectivo sí es una lectura honesta de lo que se cobró por libra.
  const effectiveRateUsd =
    mode === CustomerBillingMode.AL_COSTO || chargedWeight <= 0 || exchange <= 0
      ? null
      : flete / chargedWeight / exchange;

  const ruleLabel = isNormal
    ? null
    : mode === CustomerBillingMode.AL_COSTO
      ? 'Tarifa preferencial (al costo)'
      : `Descuento cliente (${discountPercent}%)`;

  // Prorrateo por peso: cada paquete recibe la fracción del flete que le
  // corresponde por su peso, no su precio de lista.
  const totalWeight = params.packages.reduce((acc, p) => acc + Number(p.weight_lb), 0);
  let assigned = 0;
  const lines: BreakdownLine[] = params.packages.map((pkg, i) => {
    const weight = Number(pkg.weight_lb);
    const isLast = i === params.packages.length - 1;
    // El último toma el remanente para absorber el redondeo de los anteriores.
    const subtotal = isLast
      ? flete - assigned
      : totalWeight > 0
        ? Math.round((flete * weight) / totalWeight)
        : 0;
    assigned += subtotal;
    return { tracking_number: pkg.tracking_number, weight, subtotal };
  });

  return { flete, fleteLista, descuento, lines, effectiveRateUsd, isNormal, ruleLabel };
};
