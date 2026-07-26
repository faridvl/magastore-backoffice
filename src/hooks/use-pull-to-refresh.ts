import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

const TRIGGER_DISTANCE = 80;
const MAX_DISTANCE = 120;
const RESISTANCE = 0.5;

type PullToRefreshOptions = {
    scrollRef: RefObject<HTMLElement>;
    onRefresh: () => Promise<unknown>;
    enabled?: boolean;
};

type PullToRefreshHook = {
    pullDistance: number;
    isRefreshing: boolean;
    isTriggered: boolean;
};

/**
 * Pull-to-refresh táctil para el contenedor scrolleable del dashboard.
 * Solo arma el gesto cuando el scroll está en el tope, de modo que
 * no interfiere con el desplazamiento normal de la lista.
 */
export function usePullToRefresh({
    scrollRef,
    onRefresh,
    enabled = true,
}: PullToRefreshOptions): PullToRefreshHook {
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const startYRef = useRef(0);
    const isPullingRef = useRef(false);
    const isRefreshingRef = useRef(false);

    // El listener de touchmove es pasivo=false y se registra una sola vez,
    // así que lee el estado de refresh por ref en lugar de por closure.
    useEffect(() => {
        isRefreshingRef.current = isRefreshing;
    }, [isRefreshing]);

    const runRefresh = useCallback(async () => {
        setIsRefreshing(true);
        setPullDistance(TRIGGER_DISTANCE);

        try {
            await onRefresh();
        } finally {
            setIsRefreshing(false);
            setPullDistance(0);
        }
    }, [onRefresh]);

    useEffect(() => {
        const element = scrollRef.current;

        if (!element || !enabled) return;

        function handleTouchStart(event: TouchEvent) {
            if (!element || isRefreshingRef.current) return;
            if (element.scrollTop > 0) return;

            startYRef.current = event.touches[0].clientY;
            isPullingRef.current = true;
        }

        function handleTouchMove(event: TouchEvent) {
            if (!element || !isPullingRef.current || isRefreshingRef.current) return;

            const delta = event.touches[0].clientY - startYRef.current;

            // Gesto hacia arriba o scroll ya desplazado: devolvemos el control al scroll nativo.
            if (delta <= 0 || element.scrollTop > 0) {
                isPullingRef.current = false;
                setPullDistance(0);
                return;
            }

            event.preventDefault();
            setPullDistance(Math.min(delta * RESISTANCE, MAX_DISTANCE));
        }

        function handleTouchEnd() {
            if (!isPullingRef.current) return;

            isPullingRef.current = false;

            setPullDistance((distance) => {
                if (distance >= TRIGGER_DISTANCE) {
                    void runRefresh();
                    return distance;
                }

                return 0;
            });
        }

        element.addEventListener('touchstart', handleTouchStart, { passive: true });
        element.addEventListener('touchmove', handleTouchMove, { passive: false });
        element.addEventListener('touchend', handleTouchEnd);
        element.addEventListener('touchcancel', handleTouchEnd);

        return () => {
            element.removeEventListener('touchstart', handleTouchStart);
            element.removeEventListener('touchmove', handleTouchMove);
            element.removeEventListener('touchend', handleTouchEnd);
            element.removeEventListener('touchcancel', handleTouchEnd);
        };
    }, [scrollRef, enabled, runRefresh]);

    return {
        pullDistance,
        isRefreshing,
        isTriggered: pullDistance >= TRIGGER_DISTANCE,
    };
}
