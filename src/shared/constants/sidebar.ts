import { routesPrivate } from '../navigation/routes';
import {
  LayoutDashboard,
  BadgeDollarSign,
  Users,
  Settings,
  Truck,
  Boxes,
  Landmark,
  ReceiptText,
  TrendingUp,
  BarChart2,
  BarChart3,
  MapPin,
  MessageCircle,
} from 'lucide-react';

export interface NavItem {
  menuKey: string;
  icon: React.ComponentType<{ size?: number | string; strokeWidth?: number | string; className?: string }>;
  labelKey: string;
  route: string;
  adminOnly?: boolean;
  disabled?: boolean;
}

export interface NavGroup {
  groupKey: string;
  label: string;
  items: NavItem[];
}

export const NAV_STANDALONE: NavItem[] = [
  {
    menuKey: 'dashboard',
    icon: LayoutDashboard,
    labelKey: 'Dashboard',
    route: routesPrivate.admin.dashboard,
    adminOnly: true,
  },
];

export const NAV_GROUPS: NavGroup[] = [
  {
    groupKey: 'operations',
    label: 'Operaciones',
    items: [
      {
        menuKey: 'logistics',
        icon: Truck,
        labelKey: 'Paquetes',
        route: routesPrivate.admin.logistics.index,
      },
      {
        menuKey: 'shipment-orders',
        icon: Boxes,
        labelKey: 'Órdenes de Envío',
        route: routesPrivate.admin.shipmentOrders.index,
      },
      {
        menuKey: 'billing',
        icon: BadgeDollarSign,
        labelKey: 'Facturación',
        route: routesPrivate.admin.billing.index,
        adminOnly: true,
      },
      {
        menuKey: 'customers',
        icon: Users,
        labelKey: 'Clientes',
        route: routesPrivate.admin.customers.index,
      },
    ],
  },
  {
    groupKey: 'finance',
    label: 'Finanzas',
    items: [
      {
        menuKey: 'reports',
        icon: BarChart2,
        labelKey: 'Reportes',
        route: routesPrivate.admin.billing.reports,
        adminOnly: true,
      },
      {
        menuKey: 'treasury',
        icon: Landmark,
        labelKey: 'Tesorería',
        route: '/admin/treasury',
        adminOnly: true,
        disabled: true,
      },
      {
        menuKey: 'receivables',
        icon: ReceiptText,
        labelKey: 'Cuentas por Cobrar',
        route: '/admin/receivables',
        adminOnly: true,
        disabled: true,
      },
      {
        menuKey: 'expenses',
        icon: TrendingUp,
        labelKey: 'Gastos',
        route: '/admin/expenses',
        adminOnly: true,
        disabled: true,
      },
      {
        menuKey: 'income-statement',
        icon: BarChart3,
        labelKey: 'Estado de Resultados',
        route: '/admin/income-statement',
        adminOnly: true,
        disabled: true,
      },
      {
        menuKey: 'finance-dashboard',
        icon: LayoutDashboard,
        labelKey: 'Dashboard Financiero',
        route: '/admin/finance-dashboard',
        adminOnly: true,
        disabled: true,
      },
    ],
  },
  {
    groupKey: 'admin',
    label: 'Administrativo',
    items: [
      {
        menuKey: 'settings',
        icon: Settings,
        labelKey: 'Tarifas',
        route: routesPrivate.admin.settings,
        adminOnly: true,
      },
      {
        menuKey: 'courier-rates',
        icon: Truck,
        labelKey: 'Couriers y Casilleros',
        route: routesPrivate.admin.courierRates,
        adminOnly: true,
      },
      {
        menuKey: 'customer-types',
        icon: Users,
        labelKey: 'Tipos de Cliente',
        route: routesPrivate.admin.customerTypes,
        adminOnly: true,
      },
      {
        menuKey: 'whatsapp-templates',
        icon: MessageCircle,
        labelKey: 'Plantillas de WhatsApp',
        route: routesPrivate.admin.whatsappTemplates,
        adminOnly: true,
      },
      {
        menuKey: 'addresses',
        icon: MapPin,
        labelKey: 'Datos de Direcciones',
        route: '/admin/addresses',
        adminOnly: true,
        disabled: true,
      },
    ],
  },
];
