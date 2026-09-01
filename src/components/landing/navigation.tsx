import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';
import { BrandButton } from './button';
import { Container } from './primitives';

/** Único logo oficial. No se reconstruye ni se reemplaza por texto. */
export const BRAND_LOGO = '/logo/magastore-logo-2026.png';
const LOGO_RATIO = { width: 1126, height: 718 };

export const NAV_LINKS = [
  { href: '#inicio', label: 'Inicio' },
  { href: '#como-funciona', label: 'Cómo funciona' },
  { href: '#servicios', label: 'Servicios' },
  { href: '#tarifas', label: 'Tarifas' },
  { href: '#nosotros', label: 'Nosotros' },
  { href: '#contacto', label: 'Contacto' },
] as const;

export const BrandLogo: React.FC<{ className?: string; priority?: boolean }> = ({
  className,
  priority = false,
}) => (
  <Image
    src={BRAND_LOGO}
    alt="Magastore — Compras por Internet"
    width={LOGO_RATIO.width}
    height={LOGO_RATIO.height}
    priority={priority}
    className={tailwind('w-auto', className)}
  />
);

export const Navbar: React.FC<{ ctaHref: string; ctaExternal: boolean }> = ({
  ctaHref,
  ctaExternal,
}) => {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // La navbar arranca transparente sobre el hero y gana fondo al hacer scroll.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Con el drawer abierto el fondo no debe desplazarse.
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header
      className={tailwind(
        'fixed inset-x-0 top-0 z-50 transition-colors duration-300',
        scrolled || open ? 'bg-black/95 backdrop-blur-sm' : 'bg-transparent',
      )}
    >
      <Container size="wide">
        <div className="flex h-20 items-center justify-between gap-4">
          <a href="#inicio" aria-label="Magastore — inicio" className="flex-shrink-0">
            <BrandLogo className="h-10 sm:h-12" priority />
          </a>

          <nav aria-label="Principal" className="hidden lg:block">
            <ul className="flex items-center gap-7">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-xs font-semibold uppercase tracking-wider text-white/70 transition-colors hover:text-[var(--mg-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mg-gold)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-3">
            <BrandButton
              href={ctaHref}
              external={ctaExternal}
              className="hidden sm:inline-flex"
            >
              Crea tu casillero
            </BrandButton>

            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="menu-mobile"
              aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
              className="flex h-11 w-11 items-center justify-center rounded-md text-[var(--mg-white)] transition-colors hover:text-[var(--mg-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--mg-gold)] lg:hidden"
            >
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
      </Container>

      {/* Drawer mobile: lista simple, sin animaciones que compitan con el
          contenido. Se cierra al tocar cualquier enlace. */}
      <div
        id="menu-mobile"
        hidden={!open}
        className="border-t border-white/10 bg-black lg:hidden"
      >
        <Container>
          <ul className="flex flex-col py-4">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block py-3.5 text-sm font-semibold uppercase tracking-wider text-white/75 transition-colors hover:text-[var(--mg-gold)]"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="pb-6 sm:hidden">
            <BrandButton
              href={ctaHref}
              external={ctaExternal}
              size="lg"
              className="w-full"
            >
              Crea tu casillero
            </BrandButton>
          </div>
        </Container>
      </div>
    </header>
  );
};
