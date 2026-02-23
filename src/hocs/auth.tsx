import { GetServerSidePropsContext, GetServerSideProps } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { routesPublic, routesPrivate } from '@/shared/navigation/routes';

type SSRCallback = (context: GetServerSidePropsContext, token: string) => Promise<any>;

interface AuthOptions {
  adminOnly?: boolean;
}

/**
 * PROTEGIDO: Maneja acceso de Usuarios y Admins (Magastore)
 */
export function authorizeServerSidePage(
  callback?: SSRCallback,
  options: AuthOptions = { adminOnly: false }
): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const token = CookiesManager.getAccessToken(context);
    const userRole = CookiesManager.getUserRole(context); // Asumiendo que guardas el rol en cookies

    // 1. Si no hay token, al login
    if (!token) {
      return {
        redirect: {
          destination: routesPublic.login,
          permanent: false,
        },
      };
    }

    // 2. Si la ruta es solo para Admin y el usuario no lo es
    if (options.adminOnly && userRole !== 'ADMIN') {
      return {
        redirect: {
          destination: routesPrivate.profile, // Mandarlo a su perfil de cliente
          permanent: false,
        },
      };
    }

    const additionalProps = callback ? await callback(context, token) : { props: {} };

    return {
      ...additionalProps,
      props: {
        ...(additionalProps.props || {}),
        userName: CookiesManager.getUserName(context) || null,
        role: userRole || 'USER',
        isAuthenticated: true,
      },
    };
  };
}

/**
 * INVERSO: Para Login/Register. 
 * Si ya está logueado, redirige según su rol.
 */
export function unauthorizeServerSidePage(): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const token = CookiesManager.getAccessToken(context);
    const userRole = CookiesManager.getUserRole(context);

    if (token) {
      const destination = userRole === 'ADMIN'
        ? routesPrivate.admin.dashboard
        : routesPrivate.packages;

      return {
        redirect: {
          destination,
          permanent: false,
        },
      };
    }

    return { props: {} };
  };
}