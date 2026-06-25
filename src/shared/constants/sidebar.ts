import { routesPrivate } from '../navigation/routes';
import {
  LayoutDashboard,
  Box,
  BadgeDollarSign,
  Users,
  Settings,
  Truck,
  History,
  Boxes,
} from 'lucide-react';

export const NAVIGATION_PATHS: any[] = [
  {
    menuKey: 'dashboard',
    icon: LayoutDashboard,
    labelKey: 'Dashboard',
    route: routesPrivate.admin.dashboard,
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
  },
];
