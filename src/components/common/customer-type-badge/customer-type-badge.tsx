import React from 'react';
import { CustomerBillingMode } from '@/types/customer/customer.types';

const MODE_STYLES: Record<string, string> = {
  NORMAL: 'bg-slate-100 text-slate-500',
  AL_COSTO: 'bg-sky-50 text-sky-700',
  DESCUENTO: 'bg-amber-50 text-amber-700',
};

/**
 * Etiqueta del tipo de cliente. Solo agrega el detalle de la regla cuando
 * cambia lo que se cobra — un cliente NORMAL no necesita explicación.
 */
export const CustomerTypeBadge: React.FC<{
  name: string;
  mode: CustomerBillingMode | null;
  discount?: number | null;
  className?: string;
}> = ({ name, mode, discount, className = '' }) => {
  const detail =
    mode === CustomerBillingMode.AL_COSTO
      ? 'sin ganancia'
      : mode === CustomerBillingMode.DESCUENTO && discount
        ? `-${Number(discount)}%`
        : null;

  return (
    <span
      className={`inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${MODE_STYLES[mode ?? 'NORMAL'] ?? MODE_STYLES.NORMAL} ${className}`}
      title={mode === CustomerBillingMode.AL_COSTO ? 'Solo paga el costo real del courier' : undefined}
    >
      {name}
      {detail && <span className="font-bold opacity-75">· {detail}</span>}
    </span>
  );
};
