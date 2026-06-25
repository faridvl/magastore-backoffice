import { routesPrivate } from '../navigation/routes';
import {
  LayoutDashboard,
  BadgeDollarSign,
  Users,
  Settings,
  Truck,
  Boxes,
} from 'lucide-react';

export interface NavItem {
  menuKey: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
  labelKey: string;
  route: string;
  adminOnly?: boolean;
}

export const NAVIGATION_PATHS: NavItem[] = [
  {
    menuKey: 'dashboard',
    icon: LayoutDashboard,
    labelKey: 'Dashboard',
    route: routesPrivate.admin.dashboard,
    adminOnly: true,
  },
  {
    menuKey: 'logistics',
    icon: Truck,
    labelKey: 'Logística / Paquetes',
    route: routesPrivate.admin.logistics.index,
  },
  {
    menuKey: 'consolidations',
    icon: Boxes,
    labelKey: 'Consolidaciones',
    route: routesPrivate.admin.consolidations.index,
  },
  {
    menuKey: 'billing',
    icon: BadgeDollarSign,
    labelKey: 'Cobros y Ganancias',
    route: routesPrivate.admin.billing.index,
    adminOnly: true,
  },
  {
    menuKey: 'customers',
    icon: Users,
    labelKey: 'Mis Clientes',
    route: routesPrivate.admin.customers.index,
  },
  {
    menuKey: 'settings',
    icon: Settings,
    labelKey: 'Tarifas y Config.',
    route: routesPrivate.admin.settings,
    adminOnly: true,
  },
];
