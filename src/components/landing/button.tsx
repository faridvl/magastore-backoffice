import React from 'react';
import { tailwind } from '@/utils/tailwind-utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

interface BrandButtonProps {
  children: React.ReactNode;
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  external?: boolean;
  className?: string;
  'aria-label'?: string;
}

const VARIANTS: Record<ButtonVariant, string> = {
  // CTA principal: dorado sólido sobre negro. Es el único botón relleno del
  // landing, para que siempre quede claro cuál es la acción prioritaria.
  primary:
    'bg-[var(--mg-gold)] text-black hover:bg-[var(--mg-gold-medium)] active:bg-[var(--mg-gold-dark)]',
  secondary:
    'border border-white/25 text-[var(--mg-white)] hover:border-[var(--mg-gold)] hover:text-[var(--mg-gold)]',
  ghost: 'text-[var(--mg-white)] hover:text-[var(--mg-gold)]',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'px-5 py-2.5 text-sm',
  lg: 'px-7 py-3.5 text-sm sm:text-base',
};

export const BrandButton: React.FC<BrandButtonProps> = ({
  children,
  href,
  variant = 'primary',
  size = 'md',
  external = false,
  className,
  'aria-label': ariaLabel,
}) => (
  <a
    href={href}
    aria-label={ariaLabel}
    target={external ? '_blank' : undefined}
    rel={external ? 'noopener noreferrer' : undefined}
    className={tailwind(
      'inline-flex items-center justify-center gap-2 rounded-md font-bold uppercase tracking-wide',
      'transition-colors duration-200',
      'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mg-gold)]',
      VARIANTS[variant],
      SIZES[size],
      className,
    )}
  >
    {children}
  </a>
);
