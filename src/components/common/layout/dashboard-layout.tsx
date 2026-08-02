import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/router';
import { useQueryClient } from '@tanstack/react-query';
import { Header } from '../header/header';
import { DashboardLayoutContent } from './dasboard-content';
import { BoxedLayoutStyle } from './boxed-container/boxed-container';
import { SuccessAlert } from '../alerts/success-alert';
import { tailwind } from '@/utils/tailwind-utils';
import DesktopSidebar from '../sidebar/desktop-sidebar/desktop-sidebar';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useSwipeBack } from '@/hooks/use-swipe-back';
import { PullToRefreshIndicator } from '../pull-to-refresh/pull-to-refresh-indicator';

export type UseDashboardLayoutHook = {
  setPageTitle: (title: string) => void;
  setHasBackButton: (value: boolean) => void;
  setHeaderMenu: (actionButtonProps: any) => void;
  setActionsButton: (actionButtonProps: any) => void;
  setBackNavigationHandler: (handler: () => void) => void;
  setContentClassNames: (classNames: string) => void;
  setDashBoardPadding: (bottomPadding: string) => void;
  setBoxClassName: (classnames: string) => void;
  setShowSuccess: (value: boolean) => void;
};

type LayoutProps = {
  title?: string;
  contentStyle?: BoxedLayoutStyle;
  isMainPage?: boolean;
  // Cambiamos ReactNode por any o React.ReactElement en la función para evitar conflictos de tipos
  children?: React.ReactNode | ((useDashboardLayout: UseDashboardLayoutHook) => React.ReactNode);
  onScroll?: (event: React.UIEvent<HTMLDivElement>) => void;
  hideSidebar?: boolean;
};

export function DashboardLayout({
  children,
  isMainPage = true,
  title,
  contentStyle = BoxedLayoutStyle.BOXED,
  onScroll,
  hideSidebar = false,
}: LayoutProps) {
  const [pageTitle, setPageTitle] = useState(title);
  const [contentClassNames, setContentClassNames] = useState('');
  const [bottomPadding, setDashBoardPadding] = useState('');
  const [backNavigationHandler, setBackNavigationHandler] = useState<() => void>();
  const [headerMenu, setHeaderMenu] = useState<any>([]);
  const [actionsButton, setActionsButton] = useState<any>();
  const [hasBackButton, setHasBackButton] = useState(!isMainPage);
  const [boxClassName, setBoxClassName] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const router = useRouter();

  /**
   * Retroceso del header. Ninguna pantalla llama a setBackNavigationHandler, así
   * que sin este fallback la flecha se renderizaba pero no hacía nada al tocarla.
   *
   * Importa sobre todo en la PWA instalada: en modo standalone iOS no muestra
   * barra de navegador ni ofrece gesto de retroceso entre páginas, con lo cual
   * esta flecha es la única salida visible de una pantalla de detalle.
   *
   * history.length <= 1 significa que se entró directo por URL (o es la primera
   * vista de la sesión standalone): ahí router.back() dejaría al usuario fuera de
   * la app o en blanco, así que se sube un nivel en la ruta.
   */
  const handleHeaderBack = useCallback(() => {
    if (backNavigationHandler) {
      backNavigationHandler();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
      return;
    }
    const parent = router.asPath.split('?')[0].split('/').slice(0, -1).join('/');
    router.push(parent || '/admin/dashboard');
  }, [backNavigationHandler, router]);

  // Refresca solo las queries montadas en la pantalla actual, en lugar de
  // recargar la página: conserva filtros, paginación y estado del container.
  const handleRefresh = useCallback(
    () => queryClient.refetchQueries({ type: 'active' }),
    [queryClient],
  );

  const { pullDistance, isRefreshing, isTriggered } = usePullToRefresh({
    scrollRef: scrollContainerRef,
    onRefresh: handleRefresh,
  });

  // history.length se lee en efecto, no en render: en SSR no existe window, y
  // leerlo directo daría un desajuste de hidratación.
  const [canGoBack, setCanGoBack] = useState(false);
  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, [router.asPath]);

  // Solo en pantallas de detalle: en una principal no hay a dónde retroceder y
  // el gesto sacaría al operador de su sección sin querer.
  //
  // Sin historial el gesto queda inerte, siguiendo iOS: ahí el swipe desde el
  // borde no hace absolutamente nada, ni mueve la pantalla. El botón del header
  // sí conserva su fallback — un control visible debe responder siempre.
  const { dragDistance, isTriggered: isSwipeTriggered } = useSwipeBack({
    onBack: handleHeaderBack,
    enabled: !isMainPage,
    canGoBack,
  });

  useEffect(() => {
    if (showSuccess) {
      const timer = setTimeout(() => setShowSuccess(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showSuccess]);

  useEffect(() => {
    if (title) setPageTitle(title);
  }, [title]);

  const layoutControls: UseDashboardLayoutHook = {
    setPageTitle,
    setHasBackButton,
    setBackNavigationHandler,
    setHeaderMenu,
    setActionsButton,
    setContentClassNames,
    setDashBoardPadding,
    setBoxClassName,
    setShowSuccess,
  };

  // Resolvemos el contenido antes de pasarlo para evitar el error de tipado
  const renderedChildren = typeof children === 'function'
    ? (children(layoutControls) as React.ReactElement)
    : (children as React.ReactElement);

  return (
    <div className="flex h-screen w-screen overflow-hidden relative bg-slate-50 dark:bg-background transition-colors duration-300">

      {/* Notificaciones Flotantes */}
      <div className="absolute top-6 right-6 z-[100] pointer-events-none">
        {showSuccess && (
          <div className="pointer-events-auto animate-fade-in-down">
            <SuccessAlert onClose={() => setShowSuccess(false)} />
          </div>
        )}
      </div>

      {/* Sidebar desktop — siempre visible en lg+ */}
      {!hideSidebar && (
        <div className="hidden lg:flex">
          <DesktopSidebar />
        </div>
      )}

      {/* Sidebar mobile — overlay cuando está abierto */}
      {!hideSidebar && mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            <DesktopSidebar onClose={() => setMobileSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* La pantalla acompaña al dedo mientras se arrastra. Sin este
          desplazamiento el gesto no da señal de estar ocurriendo y se siente
          roto hasta que la página cambia de golpe. La transición se desactiva
          durante el arrastre para que siga al dedo sin retraso, y se reactiva al
          soltar para que el rebote sea suave. */}
      <div
        className={tailwind(
          "flex flex-col flex-1 h-full min-w-0",
          dragDistance === 0 && "transition-all",
          !hideSidebar && "lg:border-l border-slate-200 dark:border-slate-800"
        )}
        style={dragDistance > 0 ? {
          transform: `translateX(${dragDistance}px)`,
          // Se atenúa al arrastrar para reforzar que la pantalla se está yendo.
          opacity: isSwipeTriggered ? 0.72 : 1 - (dragDistance / 900),
        } : undefined}
      >
        {!hideSidebar && (
          <Header
            title={pageTitle}
            hasBackButton={hasBackButton}
            onBack={handleHeaderBack}
            onMenuToggle={() => setMobileSidebarOpen((v) => !v)}
          />
        )}

        <DashboardLayoutContent
          contentClassNames={tailwind(contentClassNames, bottomPadding)}
          onScroll={onScroll}
          contentStyle={contentStyle}
          boxClassName={boxClassName}
          containerRef={scrollContainerRef}
          overlay={
            <PullToRefreshIndicator
              pullDistance={pullDistance}
              isRefreshing={isRefreshing}
              isTriggered={isTriggered}
            />
          }
        >
          {renderedChildren}
        </DashboardLayoutContent>
      </div>
    </div>
  );
}