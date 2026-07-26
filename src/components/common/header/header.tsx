import React, { Fragment } from 'react';
import Image from 'next/image';
import { LogOut, Search, ChevronLeft, Menu as MenuIcon } from 'lucide-react';
import { Menu, MenuButton, MenuItem, MenuItems, Transition } from '@headlessui/react';
import { useHeader } from './use-header';
import { Typography, TypographyVariant } from '../typography/typography';
import { Button, ButtonVariant } from '../button/button';
import { tailwind } from '@/utils/tailwind-utils';
import { useNavigation } from '@/hooks/use-navigation'; // Usando tu hook de navegación

interface HeaderProps {
  title?: string;
  hasBackButton?: boolean;
  onBack?: () => void;
  primaryAction?: any;
  onMenuToggle?: () => void;
}

export function Header({
  title,
  hasBackButton,
  onBack,
  primaryAction,
  onMenuToggle,
}: HeaderProps) {
  const { userName, userRole, isLoading, handleLogout } = useHeader();
  const nav = useNavigation();

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-background/90 backdrop-blur-sm sticky top-0 z-40 transition-colors">
      <div className="h-full px-3 sm:px-6 flex items-center justify-between">

        {/* Sección Izquierda: Hamburger (mobile) + Título y Volver */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <MenuIcon size={20} className="text-slate-500" />
            </button>
          )}
          {hasBackButton && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors group"
            >
              <ChevronLeft size={20} className="text-slate-500 group-hover:text-primary" />
            </button>
          )}

          {title && (
            <Typography
              variant={TypographyVariant.SUBTITLE}
              className="text-slate-900 dark:text-white text-sm md:text-lg font-black truncate max-w-[120px] sm:max-w-[200px] md:max-w-none"
            >
              {title}
            </Typography>
          )}
        </div>

        {/* Sección Derecha: Tracking y Usuario */}
        <div className="flex items-center gap-1 sm:gap-3 md:gap-4">

          {/* BOTÓN DE TRACKING GLOBAL: Para consultas rápidas */}
          <button
            onClick={() => nav.admin.packages()} // O una ruta específica de búsqueda si la tienes
            className="flex items-center gap-2 p-2 sm:px-4 sm:py-2 bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-slate-600 dark:text-slate-400 hover:text-amber-600 rounded-xl transition-all border border-transparent hover:border-amber-100"
          >
            <Search size={18} />
            <span className="hidden md:inline text-xs font-bold uppercase tracking-wider">Rastrear Paquete</span>
          </button>

          {primaryAction && (
            <Button
              variant={ButtonVariant.PRIMARY}
              text={primaryAction.label}
              onClick={primaryAction.onClick}
              className="h-9 px-4 text-xs"
            />
          )}

          <div className="w-px h-8 bg-slate-200 dark:bg-slate-800 mx-0.5 sm:mx-2" />

          {/* User Dropdown Simplificado */}
          <Menu as="div" className="relative inline-block text-left">
            <MenuButton className="flex items-center gap-3 outline-none group">
              <div className="hidden md:flex flex-col items-end leading-tight">
                <Typography variant={TypographyVariant.BODY_SEMIBOLD} className="text-[13px]">
                  {isLoading ? '...' : userName}
                </Typography>
                <Typography variant={TypographyVariant.CAPTION} className="text-primary uppercase font-black text-[9px]">
                  {userRole}
                </Typography>
              </div>
              {/* Fondo oscuro: el isotipo es dorado y sobre el verde de
                  `bg-primary` perdía contraste. */}
              <div className="h-10 w-10 rounded-xl bg-neutral-900 flex items-center justify-center shadow-md overflow-hidden shrink-0">
                <Image
                  src="/logo/magastore-isotipo-2026.png"
                  alt={userName}
                  width={741}
                  height={485}
                  className="h-full w-full object-contain p-1.5"
                />
              </div>
            </MenuButton>

            <Transition
              as={Fragment}
              enter="transition duration-100 ease-out"
              enterFrom="transform scale-95 opacity-0"
              enterTo="transform scale-100 opacity-100"
              leave="transition duration-75 ease-in"
              leaveFrom="transform scale-100 opacity-100"
              leaveTo="transform scale-95 opacity-0"
            >
              <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-100 dark:border-slate-800 p-2 focus:outline-none">
                <MenuItem>
                  {({ active }) => (
                    <button
                      onClick={handleLogout}
                      className={tailwind(
                        "flex items-center gap-3 px-4 py-3 rounded-xl w-full text-left transition-colors",
                        active ? "bg-red-50 dark:bg-red-950/30" : ""
                      )}
                    >
                      <LogOut size={18} className="text-red-500" />
                      <Typography
                        variant={TypographyVariant.BODY_BOLD}
                        className="text-red-600 text-sm"
                      >
                        Cerrar Sesión
                      </Typography>
                    </button>
                  )}
                </MenuItem>
              </MenuItems>
            </Transition>
          </Menu>
        </div>
      </div>
    </header>
  );
}