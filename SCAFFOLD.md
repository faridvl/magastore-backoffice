# Next.js 14 Backoffice — Prompt de Scaffolding Definitivo

Usa este archivo como prompt inicial para arrancar un proyecto desde cero con esta arquitectura. Pégalo completo en Claude Code al iniciar.

---

## PROMPT

```
Estás iniciando un proyecto Next.js 14 backoffice desde cero. El stack es:
- Next.js 14 con Pages Router (NO App Router)
- TypeScript en modo strict
- Tailwind CSS (sin CSS modules)
- React Query (@tanstack/react-query v5)
- Neon PostgreSQL (@neondatabase/serverless) con el cliente SQL template-literal
- Sonner para toasts
- js-cookie para manejo de sesión
- clsx + tailwind-merge para clases condicionales
- lucide-react para iconos

---

## Arquitectura — Flujo de Datos

El flujo completo de una petición es:

Page (SSR auth) → Container → Custom Hook → React Query Hook → Next.js API handler → Service → Repository → Neon SQL

Cada capa tiene una responsabilidad única. Ninguna capa debe hacer el trabajo de otra.

---

## Estructura de Carpetas

```
src/
├── components/
│   ├── common/           # Componentes reutilizables (Button, Typography, Modal, Table, etc.)
│   │   └── layout/       # DashboardLayout, BoxedContainer
│   └── containers/       # Un container por dominio
│       └── [domain]/
│           ├── [domain]-container.tsx
│           └── use-[domain].ts
├── hocs/
│   └── auth.tsx          # authorizeServerSidePage, unauthorizeServerSidePage
├── lib/
│   └── db.ts             # Cliente Neon SQL
├── pages/
│   ├── api/
│   │   └── [domain]/
│   │       └── [route].ts
│   ├── admin/
│   │   └── [domain]/
│   │       └── index.tsx
│   └── login.tsx
├── shared/
│   ├── api/
│   │   ├── config.ts
│   │   ├── mutations/
│   │   │   ├── use-api-mutation.ts
│   │   │   └── use-[domain]-mutation.ts
│   │   ├── querys/
│   │   │   ├── use-api-query-hook.ts
│   │   │   └── [domain]/
│   │   │       └── use-[domain]-query.ts
│   │   ├── repositories/
│   │   │   └── [domain].repo.ts
│   │   └── services/
│   │       └── [domain].service.ts
│   ├── errors/
│   │   └── fetch-error.ts
│   ├── navigation/
│   │   └── routes.ts
│   └── utils/
│       └── cookies-manager.ts
├── types/
│   └── [domain]/
│       └── [domain].types.ts
└── utils/
    └── tailwind-utils.ts
```

---

## Archivos Base — Genéralos Exactamente Así

### src/lib/db.ts
```ts
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DB_POSTGRES_URL!);

export default sql;
```

### src/shared/api/config.ts
```ts
export const env = {
  API: {
    BASE_URL: process.env.NEXT_PUBLIC_API_URL || '/api',
  },
};
```

### src/utils/tailwind-utils.ts
```ts
import { twMerge } from 'tailwind-merge';
import clsx from 'clsx';

type ClassValue = string | number | null | boolean | undefined | { [id: string]: any } | ClassValue[];

export function tailwind(...classes: ClassValue[]): string {
  return twMerge(clsx(classes));
}
```

### src/shared/utils/cookies-manager.ts
```ts
import Cookies from 'js-cookie';
import { GetServerSidePropsContext, NextPageContext } from 'next';

const TOKEN_KEY = 'SESSION_ACCESS_TOKEN';
const USER_NAME_KEY = 'SESSION_USER_NAME';
const USER_ROLE_KEY = 'SESSION_USER_ROLE';

type CookieConfig = Cookies.CookieAttributes;

export class CookiesManager {
  private static readonly config: CookieConfig = {
    expires: 1,
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  };

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

  static getUserRole(context?: GetServerSidePropsContext | NextPageContext): string | undefined {
    return this.getCookieByKey(USER_ROLE_KEY, context);
  }

  private static getCookieByKey(
    key: string,
    context?: GetServerSidePropsContext | NextPageContext,
  ): string | undefined {
    if (context?.req?.headers?.cookie) {
      const cookieHeader = context.req.headers.cookie;
      const cookies = Object.fromEntries(
        cookieHeader.split(';').map((c) => {
          const [name, ...value] = c.split('=');
          return [name.trim(), value.join('=')];
        }),
      );
      return cookies[key];
    }
    if (typeof window !== 'undefined') {
      return Cookies.get(key);
    }
    return undefined;
  }

  static clearAll(): void {
    const options = { path: '/' };
    Cookies.remove(TOKEN_KEY, options);
    Cookies.remove(USER_NAME_KEY, options);
    Cookies.remove(USER_ROLE_KEY, options);
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}
```

### src/hocs/auth.tsx
```tsx
import { GetServerSidePropsContext, GetServerSideProps } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';

type SSRCallback = (context: GetServerSidePropsContext, token: string) => Promise<any>;

interface AuthOptions {
  adminOnly?: boolean;
}

export function authorizeServerSidePage(
  callback?: SSRCallback,
  options: AuthOptions = { adminOnly: false },
): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const token = CookiesManager.getAccessToken(context);
    const userRole = CookiesManager.getUserRole(context);

    if (!token) {
      return { redirect: { destination: '/login', permanent: false } };
    }

    if (options.adminOnly && userRole !== 'ADMIN') {
      return { redirect: { destination: '/dashboard', permanent: false } };
    }

    let additionalProps: any = { props: {} };
    if (callback) {
      additionalProps = await callback(context, token);
    }

    if ('redirect' in additionalProps || 'notFound' in additionalProps) {
      return additionalProps;
    }

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

export function unauthorizeServerSidePage(): GetServerSideProps {
  return async (context: GetServerSidePropsContext) => {
    const token = CookiesManager.getAccessToken(context);
    if (token) {
      return { redirect: { destination: '/admin/dashboard', permanent: false } };
    }
    return { props: {} };
  };
}
```

### src/shared/api/querys/use-api-query-hook.ts
```ts
import {
  UseQueryResult as UseReactQueryResult,
  UseQueryOptions as UseReactQueryOptions,
  useQuery,
} from '@tanstack/react-query';

export type UseAPIQueryOptions = Omit<UseReactQueryOptions, 'queryFn' | 'queryKey'>;
export type UseAPIQueryResult<DataType> = UseReactQueryResult<DataType, Error>;

export type UseAPIQueryHook<ResultType> = {
  useQuery: (options?: UseAPIQueryOptions) => UseAPIQueryResult<ResultType>;
  invalidate: () => Promise<void>;
};

export function useApiQuery<DataType>(options: UseReactQueryOptions): UseAPIQueryResult<DataType> {
  return useQuery({ ...options }) as UseAPIQueryResult<DataType>;
}
```

### src/shared/api/mutations/use-api-mutation.ts
```ts
import { useMutation, UseMutationOptions, UseMutationResult } from '@tanstack/react-query';

export function useApiMutation<TData = any, TVariables = any, TError = Error>(
  options: UseMutationOptions<TData, TError, TVariables>,
): UseMutationResult<TData, TError, TVariables> {
  return useMutation(options);
}
```

---

## Reglas de Cada Capa

### Pages (`src/pages/admin/[domain]/index.tsx`)
- Llaman `authorizeServerSidePage()` en `getServerSideProps`. Eso es todo el SSR.
- Renderizan `DashboardLayout` y montan **un solo** container.
- Cero estado, cero lógica, cero fetching directo.

```tsx
export const getServerSideProps = authorizeServerSidePage(undefined, { adminOnly: true });

const MyPage: React.FC = () => (
  <>
    <Head><title>Sección | App</title></Head>
    <DashboardLayout title="Sección">
      <MyContainer />
    </DashboardLayout>
  </>
);

export default MyPage;
```

### Containers (`src/components/containers/[domain]/[domain]-container.tsx`)
- Consumen un único custom hook. Renderizan UI. Nada más.
- No llaman React Query directamente. No tienen `useState` de datos.
- Todos los handlers, listas, flags de loading vienen del hook.

### Custom Hooks (`src/components/containers/[domain]/use-[domain].ts`)
- Dueños del estado local: paginación, búsqueda, filtros, modales.
- Llaman hooks de React Query. Retornan un objeto plano.
- Debounce en búsquedas: 400ms con `useEffect` + `setTimeout`. Reset page a 1 al cambiar búsqueda.
- Nunca exponen el resultado crudo de `useQuery` hacia afuera.

```ts
export function useDomain() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const query = useDomainQuery({ page, search: debouncedSearch });
  const { data, isLoading } = query.useQuery();

  return {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    page,
    setPage,
    search,
    setSearch,
    isLoading,
  };
}
```

### React Query — GET (`src/shared/api/querys/[domain]/use-[domain]-query.ts`)
```ts
import { useQueryClient } from '@tanstack/react-query';
import { useApiQuery, UseAPIQueryHook } from '../use-api-query-hook';
import { ApiServiceClient } from '@/shared/api/client';
import { env } from '@/shared/api/config';

const QUERY_KEY = (params: Params) => ['domain', params];

export function useDomainQuery(params: Params): UseAPIQueryHook<Response> {
  const queryClient = useQueryClient();

  return {
    useQuery: (options) =>
      useApiQuery({
        queryKey: QUERY_KEY(params),
        queryFn: () => ApiServiceClient.get(`${env.API.BASE_URL}/domain`, { params }),
        placeholderData: (prev) => prev,
        staleTime: 1000 * 60 * 5,
        ...options,
      }),
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['domain'] }),
  };
}
```

### React Query — Mutations (`src/shared/api/mutations/use-[domain]-mutation.ts`)
- Llaman `toast.success` en `onSuccess` y `toast.error` en `onError`. Sin excepción.
- Invalidan el query correspondiente en `onSuccess`.

```ts
import { toast } from 'sonner';
import { useApiMutation } from './use-api-mutation';
import { useDomainQuery } from '../querys/domain/use-domain-query';

export function useCreateDomainMutation() {
  const query = useDomainQuery({});

  return useApiMutation({
    mutationFn: (data: CreatePayload) =>
      ApiServiceClient.post(`${env.API.BASE_URL}/domain`, data),
    onSuccess: () => {
      toast.success('Registro creado correctamente');
      query.invalidate();
    },
    onError: () => {
      toast.error('Error al crear el registro');
    },
  });
}
```

### API Handlers (`src/pages/api/[domain]/[route].ts`)
- Validar método → 405 si no corresponde.
- Extraer token → 401 si ausente.
- Delegar todo a service. Sin SQL, sin reglas de negocio.
- Éxito: `{ data }`. Error: `{ message }` con código apropiado.

```ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { CookiesManager } from '@/shared/utils/cookies-manager';
import { domainService } from '@/shared/api/services/domain.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Método no permitido' });
  }

  const token = CookiesManager.getAccessToken({ req, res } as any);
  if (!token) {
    return res.status(401).json({ message: 'No autorizado' });
  }

  try {
    const data = await domainService.getAll(req.query);
    return res.status(200).json({ data });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
}
```

### Services (`src/shared/api/services/[domain].service.ts`)
- Validación de inputs. Reglas de negocio. Transformación de datos.
- Llaman al repositorio. Capturan errores del repo y re-lanzan con contexto.
- Sin SQL directo.

### Repositories (`src/shared/api/repositories/[domain].repo.ts`)
- Solo SQL. Usan el cliente `sql` de `src/lib/db.ts`.
- Nunca `SELECT *` — listar columnas explícitamente.
- Operaciones multi-tabla: `BEGIN` / `COMMIT` / `ROLLBACK` explícito.
- Joins o `json_agg` para datos relacionados — nunca N+1.
- Lanzan errores hacia arriba sin capturar.

```ts
import sql from '@/lib/db';

export async function getAll({ page = 1, limit = 10, search = '' }) {
  const offset = (page - 1) * limit;
  const rows = await sql`
    SELECT id, name, created_at
    FROM entities
    WHERE name ILIKE ${'%' + search + '%'}
    ORDER BY created_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `;
  const [{ count }] = await sql`
    SELECT COUNT(*)::int AS count FROM entities
    WHERE name ILIKE ${'%' + search + '%'}
  `;
  return { data: rows, total: count };
}
```

---

## Convenciones de TypeScript

- Nunca `any`. Si el tipo es desconocido, usar `unknown` + type guard.
- Nunca `@ts-ignore` ni `@ts-expect-error`.
- Interfaces explícitas para todo lo compartido entre archivos.
- Tipos en `src/types/[domain]/[domain].types.ts`.
- Reusar `PaginatedResponse<T>` u otros tipos base antes de definir nuevos.

---

## Convenciones de Naming

| Tipo | Patrón |
|---|---|
| Custom hook | `use-[domain].ts` |
| React Query GET | `use-[domain]-query.ts` |
| React Query mutation | `use-[domain]-mutation.ts` |
| Service | `[domain].service.ts` |
| Repository | `[domain].repo.ts` |
| Types | `[domain].types.ts` |
| Container | `[domain]-container.tsx` |

---

## Checklist para Cada Feature Nueva (en orden)

1. Tipos en `src/types/[domain]/[domain].types.ts`
2. Método en repositorio `src/shared/api/repositories/[domain].repo.ts`
3. Método en service `src/shared/api/services/[domain].service.ts`
4. Handler en `src/pages/api/[domain]/[route].ts`
5. Hook React Query en `src/shared/api/querys/` o `mutations/`
6. Custom hook co-ubicado con el container
7. Container component
8. Page (shell delgado)

---

## Reglas de Error Handling

```
throw en repository
  → catch + re-throw con contexto en service
    → catch en handler → HTTP status + { message }
```

---

## Reglas de React Query

- `placeholderData: (prev) => prev` en **todas** las queries paginadas.
- `staleTime: 1000 * 60 * 5` como valor por defecto.
- Query keys incluyen todos los parámetros de filtro/paginación como variables estables.
- No crear objetos ni arrays inline dentro de `queryKey`.

---

## Reglas de Toasts (Sonner)

- **Toda** mutación (insert / update / delete) muestra `toast.success` en `onSuccess` y `toast.error` en `onError`.
- Sin excepción. Sin console.log como sustituto.

---

## Reglas de Styling

- Tailwind únicamente. Sin CSS modules.
- Usar `tailwind()` de `src/utils/tailwind-utils.ts` para clases condicionales.
- Variantes de componentes mediante enums (ej. `ButtonVariant`) mapeados a strings de Tailwind.

---

## Variables de Entorno Requeridas (`.env.local`)

```
NEXT_PUBLIC_API_URL=http://localhost:3000/api
DB_POSTGRES_URL=postgresql://...
JWT_SECRET=your-secret-key
```

---

## Workflow Obligatorio Antes de Escribir Código

1. Leer todos los archivos relacionados — trazar el slice vertical completo: tipos → service → repo → handler → hook → container.
2. Entender el flujo de ejecución — evento UI → query DB → respuesta.
3. Buscar una feature similar ya construida y usarla como patrón de referencia.
4. Analizar impacto en otros componentes, cache keys, tipos y queries.
5. Presentar un plan antes de implementar. Esperar confirmación en tareas no triviales.

No implementar después de leer un solo archivo. No inferir el panorama completo desde una sola capa.

---

## Reglas de Refactoring

- No hacer refactors oportunistas. Si la tarea es "agregar un campo", cambiar solo el formulario.
- No renombrar archivos, mover carpetas ni reorganizar estructura salvo que se pida explícitamente.
- No cambiar código fuera del mínimo de archivos requeridos por la tarea.
- Si se nota un problema en un archivo que se está editando, mencionarlo en el resumen pero no corregirlo salvo que se pida.

---

## Reglas de Base de Datos

- Leer el archivo de repositorio del dominio correspondiente antes de escribir cualquier query nueva.
- Extender funciones existentes cuando el cambio es aditivo. Crear función nueva solo si la query es estructuralmente diferente.
- Nunca `SELECT *`. Listar columnas explícitamente.
- Evitar N+1. Usar JOINs o `json_agg` para datos relacionados.
- Operaciones que tocan más de una tabla: usar transacciones explícitas (`BEGIN` / `COMMIT` / `ROLLBACK`).
```

---

## Cómo Usar Este Archivo

1. Crea tu proyecto con `npx create-next-app@latest --typescript --tailwind --no-app-router --no-src-dir` y luego mueve todo a `src/`.
2. Instala las dependencias adicionales:
   ```bash
   npm install @tanstack/react-query @neondatabase/serverless sonner js-cookie clsx tailwind-merge lucide-react jsonwebtoken bcryptjs
   npm install -D @types/js-cookie @types/jsonwebtoken @types/bcryptjs
   ```
3. Configura el alias `@/*` → `src/*` en `tsconfig.json`.
4. Pega el bloque `## PROMPT` completo como primer mensaje en Claude Code al iniciar el proyecto.
5. Luego describe el dominio de tu app (entidades, reglas de negocio, flujos) y pide que genere el scaffolding inicial.
