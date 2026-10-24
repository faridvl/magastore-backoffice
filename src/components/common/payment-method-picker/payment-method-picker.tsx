import React from 'react';
import { PaymentMethod } from '@/types/logistics/logistics.types';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/shared/constants/payment-methods';
import { tailwind } from '@/utils/tailwind-utils';

interface Props {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
  label?: string;
}

export const PaymentMethodPicker: React.FC<Props> = ({ value, onChange, disabled, label = 'Método de pago' }) => (
  <div>
    <p className="text-xs font-semibold text-slate-600 mb-2">{label}</p>
    <div className="flex flex-wrap gap-1.5 sm:grid sm:grid-cols-5" role="radiogroup" aria-label="Método de pago">
      {PAYMENT_METHOD_OPTIONS.map((method) => (
        <button
          key={method}
          type="button"
          role="radio"
          aria-checked={value === method}
          disabled={disabled}
          onClick={() => onChange(method)}
          className={tailwind(
            'min-h-[44px] px-2.5 rounded-xl border text-sm font-bold transition-all disabled:opacity-40',
            value === method
              ? 'bg-emerald-600 border-emerald-600 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50',
          )}
        >
          {PAYMENT_METHOD_LABELS[method]}
        </button>
      ))}
    </div>
  </div>
);
