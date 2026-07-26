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

const round2 = (value: number): number => Math.round(value * 100) / 100;

/**
 * Tarifa de entrega en USD. En BD vive en colones, así que la conversión ocurre
 * acá: el tipo de cambio se usa pero nunca se publica.
 */
const resolveDeliveryFeeUsd = (
  method: PublicDeliveryMethod,
  correosFeeCrc: number,
  exchangeRate: number,
): number => {
  if (method === 'CORREOS') return round2(correosFeeCrc / exchangeRate);
  return 0;
};

/**
 * Tarifas para el landing público, todas en USD.
 */
export const getPublicRates = async (): Promise<PublicRates> => {
  const settings = await Repo.getSettings();
  if (!settings) throw new Error('No se encontró la configuración del sistema.');

  const exchangeRate = Number(settings.exchange_rate);
  if (!exchangeRate) throw new Error('El tipo de cambio configurado no es válido.');

  return {
    price_per_lb_usd: round2(Number(settings.price_per_lb)),
    min_weight: Number(settings.min_weight),
    correos_fee_usd: round2(Number(settings.correos_fee_crc) / exchangeRate),
  };
};

/**
 * Calcula un estimado para la calculadora del landing con la misma base que la
 * facturación real: MAX(peso, min_weight) x price_per_lb, más la tarifa de
 * entrega. El resultado se entrega en USD.
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

  const exchangeRate = Number(settings.exchange_rate);
  if (!exchangeRate) throw new Error('El tipo de cambio configurado no es válido.');

  const chargedWeight = Math.max(weight_lb, Number(settings.min_weight));
  const shippingUsd = round2(chargedWeight * Number(settings.price_per_lb));
  const deliveryFeeUsd = resolveDeliveryFeeUsd(
    delivery_method,
    Number(settings.correos_fee_crc),
    exchangeRate,
  );

  return {
    charged_weight_lb: chargedWeight,
    shipping_usd: shippingUsd,
    delivery_fee_usd: deliveryFeeUsd,
    total_usd: round2(shippingUsd + deliveryFeeUsd),
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
