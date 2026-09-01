import React from 'react';
import { Container } from './primitives';
import { BrandLogo, NAV_LINKS } from './navigation';
import {
  FacebookIcon,
  InstagramIcon,
  TiktokIcon,
  WhatsappIcon,
  YoutubeIcon,
} from './social-icons';

/**
 * Redes de la marca.
 *
 * PENDIENTE: completar cada `href` con la URL real del perfil. Mientras estén
 * en `null` el icono se pinta apagado y sin enlace — se ve la fila completa
 * como en el arte de marca, pero no lleva a ninguna parte. Basta con escribir
 * la URL para que quede activo.
 */
type SocialLink = {
  key: string;
  label: string;
  href: string | null;
  Icon: React.FC<{ className?: string }>;
};

export const Footer: React.FC<{ whatsappHref: string | null }> = ({ whatsappHref }) => {
  const socials: SocialLink[] = [
    { key: 'instagram', label: 'Instagram', href: null, Icon: InstagramIcon },
    { key: 'facebook', label: 'Facebook', href: null, Icon: FacebookIcon },
    { key: 'tiktok', label: 'TikTok', href: null, Icon: TiktokIcon },
    { key: 'youtube', label: 'YouTube', href: null, Icon: YoutubeIcon },
    { key: 'whatsapp', label: 'WhatsApp', href: whatsappHref, Icon: WhatsappIcon },
  ];

  return (
    <footer className="border-t border-white/10 bg-black py-12">
      <Container size="wide">
        <div className="flex flex-col items-center gap-8 lg:flex-row lg:justify-between">
          <a href="#inicio" aria-label="Magastore — inicio">
            <BrandLogo className="h-11" />
          </a>

          <nav aria-label="Pie de página">
            <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="text-xs font-semibold uppercase tracking-wider text-white/55 transition-colors hover:text-[var(--mg-gold)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--mg-gold)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <ul className="flex items-center gap-2.5">
            {socials.map(({ key, label, href, Icon }) => (
              <li key={key}>
                {href ? (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--mg-gold)] text-black transition-colors hover:bg-[var(--mg-white)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--mg-gold)]"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ) : (
                  <span
                    aria-label={`${label} — perfil pendiente`}
                    title={`${label}: falta la URL del perfil`}
                    className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 text-white/25"
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-10 flex flex-col items-center gap-1.5 border-t border-white/10 pt-7 text-center text-xs text-white/35 sm:flex-row sm:justify-center sm:gap-3">
          <span>© {new Date().getFullYear()} Magastore</span>
          <span className="hidden text-white/20 sm:inline">·</span>
          <span>
            Magastore por <span className="text-white/55">Fernando Gutiérrez</span>
          </span>
          <span className="hidden text-white/20 sm:inline">·</span>
          <span>
            Desarrollado por <span className="text-white/55">Farid Villacís Leiva</span>
          </span>
        </div>
      </Container>
    </footer>
  );
};
