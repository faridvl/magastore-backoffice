import React from 'react';
import { EASE_EDITORIAL } from './tokens';
import { WhatsappIcon } from './social-icons';

/**
 * Botón flotante de WhatsApp, anclado abajo a la derecha. Conserva el verde
 * oficial de WhatsApp: es un código de color reconocible por el usuario y
 * pintarlo de dorado le restaría claridad al canal de contacto.
 *
 * El FAB se muestra siempre. Si falta `NEXT_PUBLIC_WHATSAPP_NUMBER` no hay
 * enlace directo al chat, pero en vez de desaparecer —dejando la página sin
 * ningún canal de contacto visible— baja a la sección de contacto.
 */
export const WhatsappFab: React.FC<{ href: string | null }> = ({ href }) => {
  const isChat = Boolean(href);

  return (
    <a
      href={href ?? '#contacto'}
      target={isChat ? '_blank' : undefined}
      rel={isChat ? 'noopener noreferrer' : undefined}
      aria-label={isChat ? 'Escribinos por WhatsApp' : 'Ir a la sección de contacto'}
      className="fixed bottom-5 right-5 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white transition-transform duration-300 hover:scale-110 active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:bottom-6 sm:right-6"
      style={{
        backgroundColor: '#25D366',
        boxShadow: '0 8px 24px rgba(37,211,102,0.45)',
        transitionTimingFunction: EASE_EDITORIAL,
      }}
    >
      <WhatsappIcon className="h-7 w-7" />
    </a>
  );
};
