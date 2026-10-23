import { BRAND, SURFACE } from '@/components/landing/tokens';

// Cabecera y total en negro de marca; el cuerpo queda claro para no gastar
// tinta al imprimir. El dorado claro no se lee sobre blanco: ahí va brownGold.
export const PDF_COLOR = {
  headerBg: BRAND.black,
  bandBg: SURFACE.card,
  gold: BRAND.gold,
  goldText: BRAND.brownGold,
  goldTint: '#FBF6E4',
  white: '#FFFFFF',
  onDark: BRAND.white,
  onDarkMuted: '#A3A3A3',
  ink: '#171717',
  inkMuted: '#525252',
  inkSubtle: '#8A8A8A',
  line: BRAND.gray,
  rowAlt: '#FAFAF7',
  paidBg: '#EAF7EE',
  paidText: '#166534',
  pendingBg: '#FFF4E5',
  pendingText: '#B45309',
} as const;
