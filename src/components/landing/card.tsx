import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';

/**
 * Card oscura con borde dorado tenue. Es la card por defecto del landing:
 * se usa en "Por qué elegir" y en "Qué necesitás".
 */
export const IconCard: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
}> = ({ icon: Icon, title, description, className }) => (
  <div
    className={tailwind(
      'group h-full rounded-lg border border-[rgba(241,212,91,0.14)] bg-[var(--mg-surface-card)] p-7',
      'transition-colors duration-300 hover:border-[rgba(241,212,91,0.4)]',
      className,
    )}
  >
    <Icon
      size={26}
      strokeWidth={1.5}
      className="mb-5 text-[var(--mg-gold)]"
      aria-hidden="true"
    />
    <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-[var(--mg-gold)]">
      {title}
    </h3>
    <p className="text-sm leading-relaxed text-white/55">{description}</p>
  </div>
);

/**
 * Card clara sobre fondo oscuro. Reservada a la sección Servicios, donde el
 * contraste invertido separa la oferta comercial del resto de la página.
 */
export const ServiceCard: React.FC<{
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
  ctaLabel?: string;
}> = ({ icon: Icon, title, description, href, ctaLabel = 'Ver más' }) => (
  <div className="flex h-full flex-col rounded-lg bg-[var(--mg-white)] p-7 sm:p-8">
    <span className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-full bg-black">
      <Icon size={22} strokeWidth={1.5} className="text-[var(--mg-gold)]" aria-hidden="true" />
    </span>
    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-black">{title}</h3>
    <p className="mb-6 flex-1 text-sm leading-relaxed text-black/65">{description}</p>
    <a
      href={href}
      className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--mg-gold-dark)] transition-colors hover:text-black focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mg-gold-dark)]"
    >
      {ctaLabel}
      <span aria-hidden="true">→</span>
    </a>
  </div>
);

/**
 * Paso numerado del proceso. En desktop los seis pasos se alinean en fila
 * unidos por una línea punteada que dibuja la sección contenedora.
 */
export const StepCard: React.FC<{
  icon: LucideIcon;
  step: number;
  title: string;
  description: string;
}> = ({ icon: Icon, step, title, description }) => (
  <div className="relative flex flex-col items-center text-center">
    <Icon
      size={30}
      strokeWidth={1.25}
      className="mb-5 text-[var(--mg-white)]"
      aria-hidden="true"
    />
    {/* El número va sobre la línea punteada del contenedor: el fondo negro
        del círculo la interrumpe para que no lo cruce por detrás. */}
    <span className="relative z-10 mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mg-gold)] text-sm font-extrabold text-black ring-8 ring-black">
      {step}
    </span>
    <h3 className="mb-2 text-xs font-bold uppercase leading-tight tracking-wider text-[var(--mg-gold)]">
      {title}
    </h3>
    <p className="text-xs leading-relaxed text-white/50">{description}</p>
  </div>
);
