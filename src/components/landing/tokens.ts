/**
 * Tokens visuales de la marca MAGASTORE.
 *
 * Viven acá y no en `tailwind.config.js` a propósito: ese archivo lo consume
 * todo el backoffice y su paleta (primary verde menta, accent amarillo) es la
 * del panel interno, no la de la marca pública. Estos tokens se inyectan como
 * CSS variables en el contenedor raíz del landing, así el sistema de colores
 * de la marca queda encapsulado en esta página.
 */
export const BRAND = {
  black: '#000000',
  white: '#F7F7F7',
  gold: '#F1D45B',
  goldMedium: '#E0B83A',
  goldDark: '#B78618',
  brownGold: '#6F4F0D',
  gray: '#E7E7E7',
  turquoise: '#66D0C0',
} as const;

/**
 * Superficies derivadas del negro de marca. El landing es mayoritariamente
 * oscuro: estos son los tres niveles de profundidad que se usan para separar
 * secciones sin recurrir a bordes duros.
 */
export const SURFACE = {
  base: '#000000',
  raised: '#0B0B0B',
  card: '#121212',
  border: 'rgba(241, 212, 91, 0.14)',
  borderStrong: 'rgba(241, 212, 91, 0.32)',
} as const;

/** Curva de easing editorial, compartida por reveals y microinteracciones. */
export const EASE_EDITORIAL = 'cubic-bezier(0.16, 0.8, 0.2, 1)';

/**
 * Variables CSS que se aplican al wrapper del landing. Permiten usar los
 * colores de marca en `style` y en clases arbitrarias de Tailwind sin tocar
 * la configuración global.
 */
export const brandCssVars: React.CSSProperties = {
  '--mg-black': BRAND.black,
  '--mg-white': BRAND.white,
  '--mg-gold': BRAND.gold,
  '--mg-gold-medium': BRAND.goldMedium,
  '--mg-gold-dark': BRAND.goldDark,
  '--mg-brown-gold': BRAND.brownGold,
  '--mg-gray': BRAND.gray,
  '--mg-turquoise': BRAND.turquoise,
  '--mg-surface-raised': SURFACE.raised,
  '--mg-surface-card': SURFACE.card,
} as React.CSSProperties;
