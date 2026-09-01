import React, { useEffect, useRef, useState } from 'react';
import { EASE_EDITORIAL } from './tokens';

/**
 * Reveal-on-scroll con IntersectionObserver + transiciones CSS. Se resuelve
 * así, y no con una librería de animación, para no sumar una dependencia al
 * backoffice por una sola página.
 */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  strong?: boolean;
}

export const Reveal: React.FC<RevealProps> = ({
  children,
  className,
  delay = 0,
  strong = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    // Respetamos a quien pidió menos movimiento en el sistema operativo.
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReduced) {
      setVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '-80px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : `translateY(${strong ? 28 : 18}px)`,
        transition: `opacity ${strong ? 0.8 : 0.6}s ${EASE_EDITORIAL} ${delay}s, transform ${
          strong ? 0.8 : 0.6
        }s ${EASE_EDITORIAL} ${delay}s`,
      }}
    >
      {children}
    </div>
  );
};
