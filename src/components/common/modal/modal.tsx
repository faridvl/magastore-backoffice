import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { tailwind } from '@/utils/tailwind-utils';

const TEXT_FIELD_SELECTOR = 'input, textarea, select, [contenteditable=""], [contenteditable="true"]';

// Modales abiertos, el último es el de arriba. El bloqueo de scroll se toma al abrir el primero
// y se suelta al cerrar el último, aunque varios se desmonten en la misma actualización.
const openModalIds: symbol[] = [];
let lockedElements: { element: HTMLElement; overflow: string }[] = [];

const lockScroll = () => {
  if (lockedElements.length > 0) return;
  // La app desplaza su propio contenedor, no el body: hay que bloquear ambos.
  const targets = [
    document.body,
    ...Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-root]')),
  ];
  lockedElements = targets.map((element) => ({ element, overflow: element.style.overflow }));
  targets.forEach((element) => {
    element.style.overflow = 'hidden';
  });
};

const unlockScroll = () => {
  lockedElements.forEach(({ element, overflow }) => {
    element.style.overflow = overflow;
  });
  lockedElements = [];
};

interface ModalProps {
  /** Sin mayúsculas forzadas: se escribe con mayúscula inicial. */
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  onClose: () => void;
  /** Pie siempre visible, aunque el cuerpo haga scroll (p. ej. la acción principal). */
  footer?: React.ReactNode;
  /** Cierra al tocar el fondo. Se apaga en formularios largos. */
  closeOnOverlayClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  /** Ancho máximo en pantallas medianas; en celular ocupa todo el ancho. */
  className?: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({
  title,
  subtitle,
  onClose,
  footer,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className,
  children,
}) => {
  // El portal necesita `document`: se monta tras el primer render del cliente.
  const [isMounted, setIsMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const modalId = useRef(Symbol('modal'));

  useEffect(() => {
    const id = modalId.current;
    openModalIds.push(id);
    lockScroll();
    return () => {
      const index = openModalIds.indexOf(id);
      if (index !== -1) openModalIds.splice(index, 1);
      if (openModalIds.length === 0) unlockScroll();
    };
  }, []);

  useEffect(() => {
    if (!closeOnEscape) return;
    const onKeyDown = (event: KeyboardEvent) => {
      // Solo el modal de arriba responde a Escape.
      if (event.key === 'Escape' && openModalIds[openModalIds.length - 1] === modalId.current) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [closeOnEscape, onClose]);

  useEffect(() => {
    if (!isMounted) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => {
      // En iPad enfocar un campo de texto sube el teclado: ahí no se devuelve el foco.
      if (previouslyFocused && !previouslyFocused.matches(TEXT_FIELD_SELECTOR)) previouslyFocused.focus?.();
    };
  }, [isMounted]);

  if (!isMounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-0 backdrop-blur-sm sm:p-4"
      onClick={closeOnOverlayClick ? onClose : undefined}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className={tailwind(
          'flex outline-none max-h-[calc(100vh-2rem)] supports-[height:100dvh]:max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-2xl animate-in fade-in zoom-in duration-200 sm:max-w-lg',
          className,
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-3 px-6 pb-2 pt-6 md:px-8">
            <div className="min-w-0">
              {title && <h2 className="break-words text-xl font-black text-slate-900">{title}</h2>}
              {subtitle && <p className="mt-1 break-words text-sm text-slate-500">{subtitle}</p>}
            </div>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100"
              >
                <X size={18} aria-hidden />
              </button>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4 md:px-8">{children}</div>

        {footer && (
          <div className="border-t border-slate-100 bg-white px-6 py-4 md:px-8">{footer}</div>
        )}
      </div>
    </div>,
    document.body,
  );
};
