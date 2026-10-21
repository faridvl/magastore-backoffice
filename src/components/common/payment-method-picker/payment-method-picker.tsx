import React from 'react';
import { PaymentMethod } from '@/types/logistics/logistics.types';
import { PAYMENT_METHOD_LABELS, PAYMENT_METHOD_OPTIONS } from '@/shared/constants/payment-methods';
import { tailwind } from '@/utils/tailwind-utils';

interface Props {
  value: PaymentMethod | null;
  onChange: (method: PaymentMethod) => void;
  disabled?: boolean;
}

export const PaymentMethodPicker: React.FC<Props> = ({ value, onChange, disabled }) => (
  <div>
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Método de pago</p>
    <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Método de pago">
      {PAYMENT_METHOD_OPTIONS.map((method) => (
        <button
          key={method}
          type="button"
          role="radio"
          aria-checked={value === method}
          disabled={disabled}
          onClick={() => onChange(method)}
          className={tailwind(
            'px-3 py-2 rounded-xl border text-xs font-bold transition-all disabled:opacity-40',
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
