import React from 'react';
import Image from 'next/image';
import { ImageIcon } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';

/**
 * Catálogo de las fotografías del landing.
 *
 * Los archivos que hoy viven en `public/images/landing/` son PLACEHOLDERS
 * generados con la paleta de marca: sirven para ver el layout terminado, no
 * son el arte final. Al llegar cada fotografía basta con sobrescribir el
 * archivo respetando su nombre y proporción — ninguna sección cambia.
 *
 * `ready: false` vuelve a mostrar el recuadro punteado con el nombre del
 * archivo pendiente, útil si se agrega un slot nuevo antes de tener su foto.
 */
export const LANDING_IMAGES = {
  hero: {
    src: '/images/landing/hero-plane.webp',
    width: 1920,
    height: 1080,
    alt: 'Avión de carga en vuelo hacia Costa Rica',
    ready: true,
  },
  bridge: {
    src: '/images/landing/woman-laptop.webp',
    width: 1400,
    height: 900,
    alt: 'Clienta de Magastore comprando en línea desde su casa',
    ready: true,
  },
  warehouse: {
    src: '/images/landing/warehouse-shelves.webp',
    width: 900,
    height: 1200,
    alt: 'Bodega de Magastore con paquetes en estantería',
    ready: true,
  },
  scale: {
    src: '/images/landing/box-on-scale.webp',
    width: 1200,
    height: 900,
    alt: 'Paquete sobre una balanza de bodega',
    ready: true,
  },
  doorstep: {
    src: '/images/landing/boxes-doorstep.webp',
    width: 1600,
    height: 1000,
    alt: 'Paquetes entregados en la puerta de una casa en Costa Rica',
    ready: true,
  },
} as const;

export type LandingImageKey = keyof typeof LANDING_IMAGES;

interface BrandImageProps {
  name: LandingImageKey;
  className?: string;
  /** Marca la imagen como LCP. Solo el hero debería usarlo. */
  priority?: boolean;
  /** `sizes` de next/image: evita descargar el original en mobile. */
  sizes?: string;
  /**
   * Las fotos van sobre secciones negras y siempre llevan texto encima o al
   * lado; el overlay mantiene legible ese texto y unifica el tono cálido.
   */
  overlay?: boolean;
}

/**
 * Renderiza la fotografía si el asset ya existe; si no, un placeholder del
 * mismo tamaño. El contenedor padre define el alto — acá solo se rellena.
 */
export const BrandImage: React.FC<BrandImageProps> = ({
  name,
  className,
  priority = false,
  sizes = '100vw',
  overlay = true,
}) => {
  const image = LANDING_IMAGES[name];

  if (!image.ready) {
    return (
      <div
        className={tailwind(
          'flex h-full w-full flex-col items-center justify-center gap-2',
          'border border-dashed border-[rgba(241,212,91,0.28)] bg-[#0B0B0B]',
          className,
        )}
        role="img"
        aria-label={`Pendiente: ${image.alt}`}
      >
        <ImageIcon
          size={26}
          strokeWidth={1.25}
          className="text-[var(--mg-gold)]/45"
          aria-hidden="true"
        />
        <span className="px-4 text-center font-mono text-[0.65rem] leading-relaxed text-[var(--mg-gold)]/55">
          {image.src.split('/').pop()}
          <br />
          <span className="text-white/25">
            {image.width}×{image.height}
          </span>
        </span>
      </div>
    );
  }

  return (
    <div className={tailwind('relative h-full w-full overflow-hidden', className)}>
      <Image
        src={image.src}
        alt={image.alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover"
      />
      {overlay && (
        <div
          className="absolute inset-0"
          aria-hidden="true"
          style={{
            background:
              'linear-gradient(to right, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 45%, rgba(0,0,0,0.25) 100%)',
          }}
        />
      )}
    </div>
  );
};
