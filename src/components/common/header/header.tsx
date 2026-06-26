import React, { Fragment } from 'react';
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
  const { userName, userRole, initials, isLoading, handleLogout } = useHeader();
  const nav = useNavigation();

  return (
    <header className="h-16 border-b border-neutral-200 dark:border-neutral-800 bg-white/90 dark:bg-background/90 backdrop-blur-sm sticky top-0 z-40 transition-colors">
      <div className="h-full px-6 flex items-center justify-between">

        {/* Sección Izquierda: Hamburger (mobile) + Título y Volver */}
        <div className="flex items-center gap-3">
          {onMenuToggle && (
            <button
              onClick={onMenuToggle}
              className="lg:hidden p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors"
            >
              <MenuIcon size={20} className="text-neutral-500" />
            </button>
          )}
          {hasBackButton && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition-colors group"
            >
              <ChevronLeft size={20} className="text-neutral-500 group-hover:text-primary" />
            </button>
          )}

          {title && (
            <Typography
              variant={TypographyVariant.SUBTITLE}
              className="text-neutral-900 dark:text-white text-base md:text-lg font-black truncate max-w-[160px] sm:max-w-xs md:max-w-none"
            >
              {title}
            </Typography>
          )}
        </div>

        {/* Sección Derecha: Tracking y Usuario */}
        <div className="flex items-center gap-3 md:gap-4">

          {/* BOTÓN DE TRACKING GLOBAL: Para consultas rápidas */}
          <button
            onClick={() => nav.admin.packages()} // O una ruta específica de búsqueda si la tienes
            className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-neutral-800 hover:bg-amber-50 dark:hover:bg-amber-900/20 text-neutral-600 dark:text-neutral-400 hover:text-amber-600 rounded-xl transition-all border border-transparent hover:border-amber-100"
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

          <div className="w-px h-8 bg-neutral-200 dark:bg-neutral-800 mx-2" />

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
              <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center font-black text-white uppercase text-xs shadow-md">
                {isLoading ? '?' : initials}
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
              <MenuItems className="absolute right-0 mt-2 w-48 origin-top-right rounded-2xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-100 dark:border-neutral-800 p-2 focus:outline-none">
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