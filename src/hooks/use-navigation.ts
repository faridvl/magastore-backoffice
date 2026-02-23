import { useRouter } from 'next/router';
import { routesPrivate, routesPublic } from '@/shared/navigation/routes';

export const useNavigation = () => {
  const router = useRouter();

  return {
    auth: {
      login: () => router.push(routesPublic.login),
      register: () => router.push(routesPublic.register),
      logout: () => {
        // Lógica de limpieza de auth aquí
        router.push(routesPublic.login);
      },
    },
    // Navegación para el Administrador (Dueño de Magastore)
    admin: {
      dashboard: () => router.push(routesPrivate.admin.dashboard),

      // Control de paquetes y pesos
      logistics: {
        list: () => router.push(routesPrivate.admin.logistics.index),
        registerPackage: () => router.push(routesPrivate.admin.logistics.create),
        editPackage: (id: string | number) => router.push(routesPrivate.admin.logistics.edit(id)),
        packageDetail: (id: string | number) =>
          router.push(routesPrivate.admin.logistics.detail(id)),
      },

      // Control de dinero y ganancias
      billing: {
        list: () => router.push(routesPrivate.admin.billing.index),
        viewReports: () => router.push(routesPrivate.admin.billing.reports),
      },

      customers: {
        list: () => router.push(routesPrivate.admin.customers.index),
        detail: (id: string | number) => router.push(routesPrivate.admin.customers.detail(id)),
      },
    },
    // Navegación para el Cliente final
    client: {
      myPackages: () => router.push(routesPrivate.myPackages),
      track: (id: string | number) => router.push(routesPrivate.packageDetail(id)),
    },
    back: () => router.back(),
  };
};
