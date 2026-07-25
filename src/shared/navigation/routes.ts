export const routesPublic = {
  home: '/',
  login: '/login',
  register: '/register',
  tracking: '/tracking', // Para que el cliente vea su paquete sin loguearse si quiere
};

export const routesPrivate = {
  // Sección Cliente (Magastore App)
  profile: '/profile',
  packages: '/packages',
  packageDetail: (id: string | number) => `/packages/${id}`,

  // Sección Admin (Gestión Logística)
  admin: {
    dashboard: '/admin/dashboard',
    packages: '/admin/packages',

    // Gestión de lo que traes del exterior
    logistics: {
      index: '/admin/logistics',
      create: '/admin/logistics/create',
      edit: (id: string | number) => `/admin/logistics/edit/${id}`,
      detail: (id: string | number) => `/admin/logistics/${id}`,
      batch: '/admin/logistics/batch-update', // Para actualizar varios pesos a la vez
    },
    // Gestión de órdenes de envío
    shipmentOrders: {
      index: '/admin/shipment-orders',
    },
    // Cobros y Facturación a clientes
    billing: {
      index: '/admin/billing',
      detail: (id: string | number) => `/admin/billing/${id}`,
      reports: '/admin/billing/reports', // Tu control de ganancias
    },
    customers: {
      index: '/admin/customers',
      create: '/admin/customers/create',
      detail: (id: string | number) => `/admin/customers/${id}`,
    },
    settings: '/admin/settings',
    courierRates: '/admin/courier-rates',
    customerTypes: '/admin/customer-types',
    whatsappTemplates: '/admin/whatsapp-templates',
    whatsappTemplateDetail: (uuid: string) => `/admin/whatsapp-templates/${uuid}`,
  },
};
