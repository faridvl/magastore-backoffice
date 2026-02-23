import React, { useState, useEffect } from 'react';
import { Header } from '../header/header';
import { DashboardLayoutContent } from './dasboard-content';
import { BoxedLayoutStyle } from './boxed-container/boxed-container';
import { SuccessAlert } from '../alerts/success-alert';
import { tailwind } from '@/utils/tailwind-utils';
import DesktopSidebar from '../sidebar/desktop-sidebar/desktop-sidebar';

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
    <div className="flex flex-row h-screen w-screen overflow-hidden relative bg-neutral-50 dark:bg-background transition-colors duration-300">

      {/* Notificaciones Flotantes */}
      <div className="absolute top-6 right-6 z-[100] pointer-events-none">
        {showSuccess && (
          <div className="pointer-events-auto animate-fade-in-down">
            <SuccessAlert onClose={() => setShowSuccess(false)} />
          </div>
        )}
      </div>

      {/* Navegación Lateral */}
      {!hideSidebar && <DesktopSidebar />}

      <div className={tailwind(
        "flex flex-col flex-1 h-full min-w-0 transition-all",
        !hideSidebar && "border-l border-neutral-200 dark:border-neutral-800"
      )}>

        <Header
          title={pageTitle}
          hasBackButton={hasBackButton}
          onBack={backNavigationHandler}
        // Si tu Header no acepta estas props aún, puedes comentarlas
        // menuActions={headerMenu}
        // primaryAction={actionsButton}
        />

        <DashboardLayoutContent
          contentClassNames={tailwind(contentClassNames, bottomPadding)}
          onScroll={onScroll}
          contentStyle={contentStyle}
          boxClassName={boxClassName}
        >
          {/* Usamos el valor ya procesado */}
          {renderedChildren}
        </DashboardLayoutContent>
      </div>
    </div>
  );
}