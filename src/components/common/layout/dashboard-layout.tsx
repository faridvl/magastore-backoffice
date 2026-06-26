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
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

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

      <div className={tailwind(
        "flex flex-col flex-1 h-full min-w-0 transition-all",
        !hideSidebar && "lg:border-l border-slate-200 dark:border-slate-800"
      )}>
        {!hideSidebar && (
          <Header
            title={pageTitle}
            hasBackButton={hasBackButton}
            onBack={backNavigationHandler}
            onMenuToggle={() => setMobileSidebarOpen((v) => !v)}
          />
        )}

        <DashboardLayoutContent
          contentClassNames={tailwind(contentClassNames, bottomPadding)}
          onScroll={onScroll}
          contentStyle={contentStyle}
          boxClassName={boxClassName}
        >
          {renderedChildren}
        </DashboardLayoutContent>
      </div>
    </div>
  );
}