import React from 'react';
import Link from "next/link";
import { useRouter } from "next/router";
import { TypographyVariant, Typography } from "../../typography/typography";
import { routesPrivate } from "@/shared/navigation/routes";
import { NAVIGATION_PATHS } from '@/shared/constants/sidebar';
import { useSidebar } from './use-sidebar';

interface DesktopSidebarProps {
  onClose?: () => void;
}

export default function DesktopSidebar({ onClose }: DesktopSidebarProps) {
  const router = useRouter();
  const { isAdmin } = useSidebar();

  return (
    <div className="flex h-full w-64 max-h-screen flex-col bg-white border-r border-neutral-100 dark:bg-background dark:border-neutral-800">

      {/* Logo Section - Magastore Identity */}
      <div className="flex h-[80px] items-center px-6 mb-2">
        <Link href={routesPrivate.admin.dashboard} className="flex items-center gap-3 group">
          <div className="h-10 w-10 bg-amber-600 rounded-xl flex items-center justify-center text-white font-black text-lg transition-all duration-300 group-hover:scale-105 group-hover:-rotate-3 shadow-lg shadow-amber-200">
            M
          </div>

          <div className="flex flex-col">
            <Typography
              variant={TypographyVariant.BODY_BOLD}
              className="text-neutral-900 dark:text-white text-[16px] tracking-tighter leading-none"
            >
              MAGA<span className="text-amber-600 font-black">STORE</span>
            </Typography>
            <span className="text-[9px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">
              Logística & Envíos
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto px-4 py-4">
        <nav className="space-y-1.5">
          {NAVIGATION_PATHS.filter((item) => !item.adminOnly || isAdmin).map((item) => {
            // Verificamos si la ruta actual coincide o es sub-ruta
            const isActive = router.pathname.startsWith(item.route);
            const Icon = item.icon;

            return (
              <Link
                key={item.menuKey}
                href={item.route}
                onClick={onClose}
                className={`
                  relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group
                  ${isActive
                    ? "text-amber-600 bg-amber-50 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                  }
                `}
              >
                {isActive && (
                  <div className="absolute left-0 w-1.5 h-6 bg-amber-600 rounded-r-full" />
                )}

                {Icon && (
                  <Icon
                    size={20}
                    strokeWidth={isActive ? 2.5 : 2}
                    className={isActive ? "text-amber-600" : "text-neutral-400 group-hover:text-neutral-600"}
                  />
                )}

                <Typography
                  variant={isActive ? TypographyVariant.BODY_SEMIBOLD : TypographyVariant.BODY}
                  className={`text-[14px] ${isActive ? "text-amber-600" : ""}`}
                >
                  {item.labelKey}
                </Typography>
              </Link>
            );
          })}
        </nav>
      </div>


    </div>
  );
}