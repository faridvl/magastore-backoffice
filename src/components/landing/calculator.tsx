import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Calculator } from 'lucide-react';
import type { PublicRates } from '@/types/settings/settings.types';

/**
 * Calculadora pública de envío.
 *
 * Consulta `/api/public/quote`, que aplica el peso mínimo y devuelve montos ya
 * convertidos a dólares. Nunca se expone el tipo de cambio.
 *
 * Solo cotiza la tarifa de envío: el método de entrega se quitó del formulario
 * a la espera de publicar la tabla de tarifas de Correos por peso real, que irá
 * en su propia sección. Por eso se consulta siempre con `RETIRO`, el método sin
 * costo de entrega, y el total que se muestra es el del envío puro.
 */
interface QuoteState {
  charged_weight_lb: number;
  shipping_usd: number;
  delivery_fee_usd: number;
  total_usd: number;
}

interface CalculatorPanelProps {
  rates: PublicRates;
  formatUsd: (value: number) => string;
}

export const CalculatorPanel: React.FC<CalculatorPanelProps> = ({ rates, formatUsd }) => {
  const [weight, setWeight] = useState('2');
  const [quote, setQuote] = useState<QuoteState | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [loadingQuote, setLoadingQuote] = useState(false);

  const requestId = useRef(0);

  const fetchQuote = useCallback(async (weightValue: string) => {
    const parsed = Number(weightValue);
    if (!weightValue || Number.isNaN(parsed) || parsed <= 0) {
      setQuote(null);
      setQuoteError(null);
      return;
    }

    const currentRequest = ++requestId.current;
    setLoadingQuote(true);

    try {
      const res = await fetch(
        `/api/public/quote?weight_lb=${encodeURIComponent(parsed)}&delivery_method=RETIRO`,
      );
      const body = await res.json();

      // Descartamos respuestas viejas que llegaron fuera de orden.
      if (currentRequest !== requestId.current) return;

      if (!res.ok) {
        setQuote(null);
        setQuoteError(body.message || 'No pudimos calcular el estimado.');
        return;
      }

      setQuote(body.data);
      setQuoteError(null);
    } catch {
      if (currentRequest !== requestId.current) return;
      setQuote(null);
      setQuoteError('Error al conectar con el servidor. Intentá de nuevo.');
    } finally {
      if (currentRequest === requestId.current) setLoadingQuote(false);
    }
  }, []);

  // Debounce de 400ms, igual que los buscadores del backoffice.
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchQuote(weight);
    }, 400);

    return () => clearTimeout(timer);
  }, [weight, fetchQuote]);

  return (
    <div className="rounded-lg border border-[rgba(241,212,91,0.2)] bg-[var(--mg-surface-card)] p-6 sm:p-8">
      <div className="mb-7 flex items-center gap-3">
        <Calculator
          size={22}
          strokeWidth={1.5}
          className="text-[var(--mg-gold)]"
          aria-hidden="true"
        />
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wide text-[var(--mg-gold)]">
            Calcula tu envío
          </h3>
          <p className="mt-0.5 text-xs text-white/45">Cotiza tu envío en segundos</p>
        </div>
      </div>

      <label
        htmlFor="peso-input"
        className="mb-2 block text-xs font-semibold uppercase tracking-wider text-white/55"
      >
        Peso del paquete (libras)
      </label>
      <input
        id="peso-input"
        type="number"
        inputMode="decimal"
        min="1"
        step="1"
        value={weight}
        onChange={(e) => setWeight(e.target.value)}
        aria-describedby="peso-ayuda"
        className="w-full rounded-md border border-white/15 bg-black px-4 py-3.5 text-lg font-semibold text-[var(--mg-white)] transition-colors focus:border-[var(--mg-gold)] focus:outline-none"
      />
      <p id="peso-ayuda" className="mt-2 text-xs text-white/35">
        Se cobra el peso real o el mínimo de {rates.min_weight} lb, lo que sea mayor.
      </p>

      <div className="mt-6 border-t border-white/10 pt-6">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs font-semibold uppercase tracking-wider text-white/55">
            Total estimado
          </span>
          <span
            aria-live="polite"
            className="text-3xl font-extrabold text-[var(--mg-gold)] sm:text-4xl"
          >
            {loadingQuote && !quote ? '…' : quote ? formatUsd(quote.total_usd) : '—'}
          </span>
        </div>

        {quote && (
          <dl className="mt-5 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Peso cobrado</dt>
              <dd className="text-white/80">{quote.charged_weight_lb} lb</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-white/45">Envío</dt>
              <dd className="text-white/80">{formatUsd(quote.shipping_usd)}</dd>
            </div>
          </dl>
        )}

        {quoteError && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {quoteError}
          </p>
        )}
      </div>

      <p className="mt-6 text-xs leading-relaxed text-white/35">
        Monto estimado en dólares. No incluye la entrega en Costa Rica. El total definitivo se
        calcula al registrar el paquete en bodega con su peso real.
      </p>
    </div>
  );
};
