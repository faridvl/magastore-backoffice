import Cookies from 'js-cookie';
import { GetServerSidePropsContext, NextPageContext } from 'next';

const TOKEN_KEY = 'SESSION_ACCESS_TOKEN';
const USER_NAME_KEY = 'SESSION_USER_NAME';
const USER_ROLE_KEY = 'SESSION_USER_ROLE'; // Nuevo: Fundamental para Magastore

type CookieConfig = Cookies.CookieAttributes;

export class CookiesManager {
  private static readonly config: CookieConfig = {
    expires: 1, // Aumentado a 1 día (o según prefieras) para mejor UX en logística
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

  /**
   * Registra la sesión completa incluyendo el rol del usuario
   */
  static setSession(token: string, userName: string, role: string): void {
    Cookies.set(TOKEN_KEY, token, this.config);
    Cookies.set(USER_NAME_KEY, userName, this.config);
    Cookies.set(USER_ROLE_KEY, role, this.config);
  }

  static getAccessToken(context?: GetServerSidePropsContext | NextPageContext): string | undefined {
    return this.getCookieByKey(TOKEN_KEY, context);
  }

  static getUserName(context?: GetServerSidePropsContext | NextPageContext): string | undefined {
    return this.getCookieByKey(USER_NAME_KEY, context);
  }

  /**
   * Nuevo: Retorna el rol (ADMIN o USER) para validaciones de Magastore
   */
  static getUserRole(context?: GetServerSidePropsContext | NextPageContext): string | undefined {
    return this.getCookieByKey(USER_ROLE_KEY, context);
  }

  private static getCookieByKey(
    key: string,
    context?: GetServerSidePropsContext | NextPageContext,
  ): string | undefined {
    // Lado del Servidor (SSR)
    if (context?.req?.headers?.cookie) {
      const cookieHeader = context.req.headers.cookie;
      const cookies = Object.fromEntries(
        cookieHeader.split('; ').map((c) => {
          const [name, ...value] = c.split('=');
          return [name.trim(), value.join('=')];
        }),
      );
      return cookies[key];
    }

    // Lado del Cliente
    return Cookies.get(key);
  }

  /**
   * Limpia todos los rastros de la sesión
   */
  static clearAll(): void {
    const options = { path: '/' };
    Cookies.remove(TOKEN_KEY, options);
    Cookies.remove(USER_NAME_KEY, options);
    Cookies.remove(USER_ROLE_KEY, options);
  }
}
