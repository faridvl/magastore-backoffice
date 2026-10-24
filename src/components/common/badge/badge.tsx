import React from 'react';
import { tailwind } from '@/utils/tailwind-utils';
import { BadgeTone } from '@/shared/constants/status-labels';

const TONE_CLASS: Record<BadgeTone, string> = {
  [BadgeTone.NEUTRAL]: 'bg-slate-100 text-slate-600 border-slate-200',
  [BadgeTone.INFO]: 'bg-sky-50 text-sky-700 border-sky-100',
  [BadgeTone.SUCCESS]: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  [BadgeTone.WARNING]: 'bg-amber-50 text-amber-700 border-amber-100',
  [BadgeTone.DANGER]: 'bg-red-50 text-red-700 border-red-100',
  [BadgeTone.VIOLET]: 'bg-violet-50 text-violet-700 border-violet-100',
};

interface BadgeProps {
  tone?: BadgeTone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = BadgeTone.NEUTRAL, icon, className, children }: BadgeProps) {
  return (
    <span
      className={tailwind(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold',
        TONE_CLASS[tone],
        className,
      )}
    >
      {icon}
      {children}
    </span>
  );
}
