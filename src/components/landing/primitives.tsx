import React from 'react';
import { tailwind } from '@/utils/tailwind-utils';

/**
 * Ancho de lectura común a todas las secciones. Un único contenedor evita que
 * cada sección invente su propio `max-w-*` y se desalineen entre sí.
 */
export const Container: React.FC<{
  children: React.ReactNode;
  className?: string;
  size?: 'default' | 'narrow' | 'wide';
}> = ({ children, className, size = 'default' }) => (
  <div
    className={tailwind(
      'mx-auto w-full px-5 sm:px-6 lg:px-8',
      size === 'narrow' && 'max-w-3xl',
      size === 'default' && 'max-w-6xl',
      size === 'wide' && 'max-w-7xl',
      className,
    )}
  >
    {children}
  </div>
);

/**
 * Ritmo vertical de las secciones. `tone` cubre los tres fondos que usa el
 * landing: negro puro, negro elevado y la banda dorada.
 */
export const Section: React.FC<{
  children: React.ReactNode;
  id?: string;
  className?: string;
  tone?: 'black' | 'raised' | 'gold';
  spacing?: 'default' | 'tight' | 'none';
}> = ({ children, id, className, tone = 'black', spacing = 'default' }) => (
  <section
    id={id}
    className={tailwind(
      'relative',
      // La navbar es fija: sin este desplazamiento, al saltar a un ancla el
      // título de la sección queda escondido detrás del header.
      id && 'scroll-mt-20',
      tone === 'black' && 'bg-black',
      tone === 'raised' && 'bg-[var(--mg-surface-raised)]',
      tone === 'gold' && 'bg-[var(--mg-gold-dark)]',
      spacing === 'default' && 'py-20 sm:py-24 lg:py-32',
      spacing === 'tight' && 'py-12 sm:py-16',
      className,
    )}
  >
    {children}
  </section>
);

/**
 * Etiqueta corta en dorado que antecede a los títulos de sección. En la
 * maqueta aparece como "¿CÓMO FUNCIONA?", "NUESTROS SERVICIOS", "TARIFAS
 * CLARAS".
 */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <span
    className={tailwind(
      'block text-[0.7rem] font-bold uppercase tracking-[0.2em] text-[var(--mg-gold)]',
      className,
    )}
  >
    {children}
  </span>
);

/**
 * Títulos de sección. El landing usa un solo h1 (el hero); todo lo demás es
 * h2 salvo que el contexto pida bajar de nivel.
 */
export const Heading: React.FC<{
  children: React.ReactNode;
  as?: 'h1' | 'h2' | 'h3';
  size?: 'hero' | 'section' | 'card';
  className?: string;
}> = ({ children, as: Tag = 'h2', size = 'section', className }) => (
  <Tag
    className={tailwind(
      'text-[var(--mg-white)]',
      size === 'hero' && 'text-4xl font-extrabold leading-[1.02] sm:text-5xl lg:text-6xl',
      size === 'section' && 'text-3xl font-extrabold leading-[1.1] sm:text-4xl',
      size === 'card' && 'text-lg font-bold leading-snug',
      className,
    )}
  >
    {children}
  </Tag>
);

/** Párrafo de apoyo bajo un Heading. */
export const Lead: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <p className={tailwind('text-base leading-relaxed text-white/60 sm:text-lg', className)}>
    {children}
  </p>
);
