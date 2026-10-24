import React from 'react';
import { CheckCircle2, Circle } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';

export enum StepActionVariant {
  PRIMARY = 'PRIMARY',
  SECONDARY = 'SECONDARY',
  LINK = 'LINK',
}

const ACTION_CLASSNAME: Record<StepActionVariant, string> = {
  [StepActionVariant.PRIMARY]:
    'min-h-[44px] px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-bold shadow-sm hover:bg-emerald-500',
  [StepActionVariant.SECONDARY]:
    'min-h-[40px] px-4 py-2 rounded-xl bg-white border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50',
  [StepActionVariant.LINK]:
    'min-h-[40px] px-1 text-sm font-semibold text-slate-500 underline underline-offset-4 hover:text-slate-800',
};

interface StepActionProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: StepActionVariant;
}

export const StepAction: React.FC<StepActionProps> = ({ variant = StepActionVariant.SECONDARY, className, ...rest }) => (
  <button
    type="button"
    {...rest}
    className={tailwind(
      'inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
      ACTION_CLASSNAME[variant],
      className,
    )}
  />
);

/**
 * Una tarea del paso: qué es, en qué quedó y la acción para resolverla. El
 * check dice de un vistazo qué falta, sin leer cada botón.
 */
export const ChecklistRow: React.FC<{
  title: string;
  // null: tarea sin estado que registrar (por ejemplo, un aviso que se puede reenviar).
  isDone?: boolean | null;
  children?: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}> = ({ title, isDone = false, children, action, id }) => (
  <li id={id} className="flex items-start gap-3 py-4 first:pt-0 last:pb-0">
    {isDone === null
      ? <span className="w-5 flex-shrink-0" />
      : isDone
        ? <CheckCircle2 size={20} className="text-emerald-500 flex-shrink-0 mt-0.5" />
        : <Circle size={20} className="text-slate-300 flex-shrink-0 mt-0.5" />}
    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-3">
      <div className="flex-1 min-w-[12rem]">
        <p className="text-sm font-bold text-slate-800 break-words">{title}</p>
        {children && <div className="text-sm text-slate-500 mt-0.5 break-words">{children}</div>}
      </div>
      {action && <div className="flex flex-wrap gap-2">{action}</div>}
    </div>
  </li>
);

export const StepCard: React.FC<{
  stepLabel: string;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}> = ({ stepLabel, title, description, children, footer }) => (
  <section className="bg-white rounded-[2rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
    <div className="p-5 sm:p-6">
      <p className="text-xs font-bold text-slate-400">{stepLabel}</p>
      <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">{title}</h2>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      <ul className="mt-5 divide-y divide-slate-100">{children}</ul>
    </div>
    {footer && (
      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3 px-5 sm:px-6 py-4 border-t border-slate-100 bg-slate-50/60 rounded-b-[2rem]">
        {footer}
      </div>
    )}
  </section>
);

/** Pie del paso: "Atrás" discreto a la izquierda y una única acción principal. */
export const StepFooter: React.FC<{
  hint?: string | null;
  back?: React.ReactNode;
  next: React.ReactNode;
}> = ({ hint, back, next }) => (
  <>
    {(back || hint) && (
      <div className="flex items-center gap-3 min-h-[40px]">
        {back}
        {hint && <p className="text-xs text-slate-500">{hint}</p>}
      </div>
    )}
    <div className="flex flex-col sm:flex-row sm:justify-end sm:ml-auto">{next}</div>
  </>
);
