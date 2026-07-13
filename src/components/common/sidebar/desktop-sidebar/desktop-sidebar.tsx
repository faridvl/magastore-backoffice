import React, { useState, useEffect } from 'react';
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronDown } from 'lucide-react';
import { TypographyVariant, Typography } from "../../typography/typography";
import { routesPrivate } from "@/shared/navigation/routes";
import { NAV_STANDALONE, NAV_GROUPS, NavGroup, NavItem } from '@/shared/constants/sidebar';
import { useSidebar } from './use-sidebar';
import { tailwind } from '@/utils/tailwind-utils';

interface DesktopSidebarProps {
  onClose?: () => void;
}

function getActiveGroup(groups: NavGroup[], pathname: string): string | null {
  for (const group of groups) {
    if (group.items.some((item) => pathname.startsWith(item.route))) {
      return group.groupKey;
    }
  }
  return null;
}

export default function DesktopSidebar({ onClose }: DesktopSidebarProps) {
  const router = useRouter();
  const { isAdmin } = useSidebar();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const active = getActiveGroup(NAV_GROUPS, router.pathname);
    const initial: Record<string, boolean> = {};
    NAV_GROUPS.forEach((g) => { initial[g.groupKey] = g.groupKey === active; });
    return initial;
  });

  useEffect(() => {
    const active = getActiveGroup(NAV_GROUPS, router.pathname);
    if (active) {
      setOpenGroups((prev) => ({ ...prev, [active]: true }));
    }
  }, [router.pathname]);

  function toggleGroup(groupKey: string) {
    setOpenGroups((prev) => ({ ...prev, [groupKey]: !prev[groupKey] }));
  }

  function renderNavItem(item: NavItem) {
    if (item.adminOnly && !isAdmin) return null;

    const isActive = !item.disabled && router.pathname.startsWith(item.route);
    const Icon = item.icon;

    const content = (
      <span
        className={tailwind(
          'relative flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 group w-full',
          isActive
            ? 'text-amber-600 bg-amber-50 shadow-sm'
            : item.disabled
              ? 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
              : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900'
        )}
      >
        {isActive && (
          <span className="absolute left-0 w-1.5 h-5 bg-amber-600 rounded-r-full" />
        )}
        {Icon && (
          <Icon
            size={17}
            strokeWidth={isActive ? 2.5 : 2}
            className={tailwind(
              isActive ? 'text-amber-600' : item.disabled ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400 group-hover:text-slate-600'
            )}
          />
        )}
        <Typography
          variant={isActive ? TypographyVariant.BODY_SEMIBOLD : TypographyVariant.BODY}
          className={tailwind(
            'text-[13px]',
            isActive ? 'text-amber-600' : item.disabled ? 'text-slate-300 dark:text-slate-600' : ''
          )}
        >
          {item.labelKey}
        </Typography>
        {item.disabled && (
          <span className="ml-auto text-[10px] font-semibold text-slate-300 dark:text-slate-600 tracking-wide">
            PRONTO
          </span>
        )}
      </span>
    );

    if (item.disabled) {
      return <div key={item.menuKey}>{content}</div>;
    }

    return (
      <Link key={item.menuKey} href={item.route} onClick={onClose}>
        {content}
      </Link>
    );
  }

  return (
    <div className="flex h-full w-64 max-h-screen flex-col bg-white border-r border-slate-100 dark:bg-background dark:border-slate-800">

      {/* Logo */}
      <div className="flex h-[92px] items-center px-6 mb-1 shrink-0">
        <Link href={routesPrivate.admin.dashboard} className="flex items-center gap-2.5 group">
          <Image
            src="/logo/magastore-logo-dark.png"
            alt="Magastore"
            width={72}
            height={72}
            className="h-[72px] w-[72px] object-contain transition-transform duration-300 group-hover:scale-105"
            priority
          />
          <div className="flex flex-col">
            <Typography
              variant={TypographyVariant.BODY_BOLD}
              className="text-slate-900 dark:text-white text-[15px] tracking-tighter leading-none"
            >
              MAGA<span className="text-primary font-black">STORE</span>
            </Typography>
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">
              Logística & Envíos
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <nav className="space-y-0.5">

          {/* Standalone items (Dashboard) */}
          {NAV_STANDALONE.filter((item) => !item.adminOnly || isAdmin).map(renderNavItem)}

          {/* Divider */}
          <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

          {/* Grouped sections */}
          {NAV_GROUPS.map((group) => {
            const visibleItems = group.items.filter((item) => !item.adminOnly || isAdmin);
            if (visibleItems.length === 0) return null;

            const isOpen = !!openGroups[group.groupKey];
            const hasActive = visibleItems.some(
              (item) => !item.disabled && router.pathname.startsWith(item.route)
            );

            return (
              <div key={group.groupKey} className="mb-1">
                {/* Accordion header */}
                <button
                  type="button"
                  onClick={() => toggleGroup(group.groupKey)}
                  className={tailwind(
                    'w-full flex items-center justify-between px-4 py-2 rounded-lg transition-colors duration-150',
                    hasActive
                      ? 'text-amber-600'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  )}
                >
                  <span className={tailwind(
                    'text-[10px] font-black uppercase tracking-[0.18em]',
                    hasActive ? 'text-amber-600' : 'text-slate-400'
                  )}>
                    {group.label}
                  </span>
                  <ChevronDown
                    size={14}
                    strokeWidth={2.5}
                    className={tailwind(
                      'transition-transform duration-200',
                      isOpen ? 'rotate-180' : 'rotate-0',
                      hasActive ? 'text-amber-500' : 'text-slate-300'
                    )}
                  />
                </button>

                {/* Accordion body */}
                {isOpen && (
                  <div className="mt-0.5 space-y-0.5 pl-1">
                    {visibleItems.map(renderNavItem)}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
