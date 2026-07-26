import * as Repo from '../repositories/settings.repo';
import type {
  PublicDeliveryMethod,
  PublicQuote,
  PublicQuoteInput,
  PublicRates,
} from '@/types/settings/settings.types';

export const getSystemDashboardData = async () => {
  return await Repo.getSettingsWithHistory();
};

const resolveDeliveryFee = (
  method: PublicDeliveryMethod,
  correosFeeCrc: number,
  tracopaFeeCrc: number,
): number => {
  if (method === 'CORREOS') return correosFeeCrc;
  if (method === 'TRACOPA') return tracopaFeeCrc;
  return 0;
};

/**
 * Tarifas para el landing público. Convierte el precio por libra a colones
 * antes de devolverlo para que el tipo de cambio nunca salga del servidor.
 */
export const getPublicRates = async (): Promise<PublicRates> => {
  const settings = await Repo.getSettings();
  if (!settings) throw new Error('No se encontró la configuración del sistema.');

  return {
    price_per_lb_crc: Math.round(Number(settings.price_per_lb) * Number(settings.exchange_rate)),
    min_weight: Number(settings.min_weight),
    correos_fee_crc: Number(settings.correos_fee_crc),
    tracopa_fee_crc: Number(settings.tracopa_fee_crc),
  };
};

/**
 * Calcula un estimado para la calculadora del landing usando la misma fórmula
 * que la facturación real: MAX(peso, min_weight) x price_per_lb x exchange_rate
 * + tarifa de entrega. Se resuelve en el servidor: el navegador solo recibe
 * montos en CRC.
 */
export const getPublicQuote = async ({
  weight_lb,
  delivery_method,
}: PublicQuoteInput): Promise<PublicQuote> => {
  if (!Number.isFinite(weight_lb) || weight_lb <= 0) {
    throw new Error('El peso debe ser un número mayor a cero.');
  }

  const settings = await Repo.getSettings();
  if (!settings) throw new Error('No se encontró la configuración del sistema.');

  const chargedWeight = Math.max(weight_lb, Number(settings.min_weight));
  const shippingCrc = Math.round(
    chargedWeight * Number(settings.price_per_lb) * Number(settings.exchange_rate),
  );
  const deliveryFeeCrc = resolveDeliveryFee(
    delivery_method,
    Number(settings.correos_fee_crc),
    Number(settings.tracopa_fee_crc),
  );

  return {
    charged_weight_lb: chargedWeight,
    shipping_crc: shippingCrc,
    delivery_fee_crc: deliveryFeeCrc,
    total_crc: shippingCrc + deliveryFeeCrc,
  };
};

export const updateSystemSettings = async (newData: any, userName: string) => {
  const { current } = await Repo.getSettingsWithHistory();

  const fields = [
    { key: 'price_per_lb',          label: 'Precio por Libra (USD)' },
    { key: 'exchange_rate',         label: 'Tipo de Cambio' },
    { key: 'min_weight',            label: 'Peso Mínimo' },
    { key: 'correos_fee_crc',       label: 'Tarifa Correos CR' },
    { key: 'tracopa_fee_crc',       label: 'Tarifa Tracopa' },
    { key: 'courier_rate_usd',      label: 'Tarifa Courier por Libra (USD)' },
    { key: 'courier_insurance_usd', label: 'Seguro Courier (USD)' },
    { key: 'kg_per_lb',             label: 'Conversión kg por libra' },
  ];

  for (const field of fields) {
    const oldVal = Number(current[field.key]);
    const newVal = Number(newData[field.key]);

    if (oldVal !== newVal) {
      await Repo.logHistory(field.label, oldVal, newVal, userName);
    }
  }

  return await Repo.updateSettings(newData);
};
