import { useEffect, useRef, useState } from 'react';

/** Zona activa desde el borde izquierdo. Fuera de ella el gesto se ignora, para
 *  no secuestrar arrastres horizontales dentro del contenido (tablas, carruseles). */
const EDGE_ZONE_PX = 28;
/** Recorrido mínimo para que cuente como retroceso. */
const TRIGGER_DISTANCE = 90;
/** Cuánto se puede arrastrar la página; más allá no acompaña. */
const MAX_DRAG = 140;
/** El gesto se descarta si el eje Y domina: es un scroll, no un retroceso. */
const VERTICAL_TOLERANCE = 1.2;

type SwipeBackOptions = {
  onBack: () => void;
  enabled?: boolean;
  /** Si no hay historial el gesto queda inerte, como en iOS. Ver canGoBack. */
  canGoBack?: boolean;
};

type SwipeBackHook = {
  /** Píxeles arrastrados, para desplazar la pantalla y dar sensación de arrastre. */
  dragDistance: number;
  /** Soltar aquí dispara el retroceso — permite anticiparlo visualmente. */
  isTriggered: boolean;
};

/**
 * Retroceso por arrastre desde el borde izquierdo.
 *
 * Existe por la PWA instalada: en modo standalone iOS no muestra barra de
 * navegador ni ofrece el gesto nativo de retroceso entre páginas, así que el
 * usuario arrastra desde el borde —gesto que da por sentado en cualquier app— y
 * no pasa nada. Esto lo reimplementa.
 *
 * Convive con usePullToRefresh: aquel solo arma su gesto con el scroll en el
 * tope y arrastre vertical hacia abajo; este exige empezar pegado al borde
 * izquierdo y descarta el gesto apenas el movimiento vertical domina. Ambos
 * escuchan en fases distintas y ninguno llama preventDefault antes de estar
 * seguro de que el gesto le pertenece.
 *
 * Sigue el comportamiento de iOS: el gesto significa "atrás en la jerarquía de
 * navegación" y nada más. Sin historial queda completamente inerte —la pantalla
 * ni se mueve— en vez de inventar un destino. Y nunca abre el menú lateral:
 * tanto iOS como Material separan a propósito el retroceso del borde de la
 * apertura del drawer, porque un mismo gesto con dos significados según un
 * estado invisible es impredecible. El sidebar se abre con su botón hamburguesa.
 */
export function useSwipeBack({ onBack, enabled = true, canGoBack = true }: SwipeBackOptions): SwipeBackHook {
  const [dragDistance, setDragDistance] = useState(0);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isTrackingRef = useRef(false);
  // Recorrido real del dedo. El umbral se mide sobre esto y no sobre
  // dragDistance, que va amortiguado: con la resistencia aplicada el valor
  // visual nunca alcanzaría el umbral y el gesto no dispararía nunca.
  const rawDeltaRef = useRef(0);
  // Hasta que el gesto no se declara horizontal se deja pasar el scroll nativo:
  // decidir antes haría que un scroll vertical iniciado cerca del borde quedara
  // trabado.
  const isHorizontalRef = useRef(false);

  useEffect(() => {
    if (!enabled || !canGoBack || typeof window === 'undefined') return;

    function handleTouchStart(event: TouchEvent) {
      // Multitouch (pinch/zoom) no es un retroceso.
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];
      if (touch.clientX > EDGE_ZONE_PX) return;

      startXRef.current = touch.clientX;
      startYRef.current = touch.clientY;
      isTrackingRef.current = true;
      isHorizontalRef.current = false;
      rawDeltaRef.current = 0;
    }

    function handleTouchMove(event: TouchEvent) {
      if (!isTrackingRef.current) return;

      const touch = event.touches[0];
      const deltaX = touch.clientX - startXRef.current;
      const deltaY = Math.abs(touch.clientY - startYRef.current);

      if (!isHorizontalRef.current) {
        // Todavía indefinido: si el dedo va hacia arriba/abajo o retrocede hacia
        // la izquierda, el gesto no es nuestro y se abandona sin tocarlo.
        if (deltaY > Math.abs(deltaX) * VERTICAL_TOLERANCE) {
          isTrackingRef.current = false;
          return;
        }
        if (deltaX < 10) return;
        isHorizontalRef.current = true;
      }

      if (deltaX <= 0) {
        rawDeltaRef.current = 0;
        setDragDistance(0);
        return;
      }

      rawDeltaRef.current = deltaX;

      // Solo se bloquea el scroll una vez confirmado que es un retroceso.
      if (event.cancelable) event.preventDefault();
      // Resistencia progresiva, como iOS: la pantalla sigue al dedo al principio
      // y se va frenando cerca del tope, en vez de detenerse de golpe al llegar
      // a MAX_DRAG.
      const eased = MAX_DRAG * (1 - Math.exp(-deltaX / MAX_DRAG));
      setDragDistance(eased);
    }

    function handleTouchEnd() {
      if (!isTrackingRef.current) {
        setDragDistance(0);
        return;
      }

      isTrackingRef.current = false;
      const wasHorizontal = isHorizontalRef.current;
      const rawDelta = rawDeltaRef.current;
      isHorizontalRef.current = false;
      rawDeltaRef.current = 0;

      setDragDistance(0);
      if (wasHorizontal && rawDelta >= TRIGGER_DISTANCE) onBack();
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [enabled, canGoBack, onBack]);

  return {
    dragDistance,
    // Equivalente amortiguado de TRIGGER_DISTANCE: con la resistencia aplicada,
    // arrastrar 90px reales se ve como ~55px de desplazamiento.
    isTriggered: dragDistance >= MAX_DRAG * (1 - Math.exp(-TRIGGER_DISTANCE / MAX_DRAG)),
  };
}
