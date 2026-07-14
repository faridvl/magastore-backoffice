import React, { useEffect, useState } from 'react';
import Image from 'next/image';

const SESSION_KEY = 'magastore-splash-shown';
const VISIBLE_MS = 1800; // logo en pantalla
const FADE_MS = 500;     // fade-out

type Phase = 'visible' | 'fading' | 'hidden';

/**
 * Splash de arranque estilo app nativa: fondo negro + logo, ~2.3s en total.
 * Se muestra una vez por sesión del navegador — al abrir la app instalada
 * (PWA) cada lanzamiento es una sesión nueva, así que siempre aparece ahí.
 */
export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('visible');

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setPhase('hidden');
      return;
    }
    sessionStorage.setItem(SESSION_KEY, '1');
    const fadeTimer = setTimeout(() => setPhase('fading'), VISIBLE_MS);
    const hideTimer = setTimeout(() => setPhase('hidden'), VISIBLE_MS + FADE_MS);
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === 'hidden') return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[9999] bg-black flex items-center justify-center transition-opacity ease-out ${
        phase === 'fading' ? 'opacity-0' : 'opacity-100'
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <div className="animate-splash-logo flex flex-col items-center px-10">
        <Image
          src="/logo/magastore-perfil-transparent.png"
          alt="Magastore — Compras por Internet"
          width={320}
          height={320}
          priority
          className="w-56 sm:w-72 h-auto object-contain"
        />
      </div>
    </div>
  );
}
