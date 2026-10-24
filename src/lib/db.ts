import { neon, neonConfig } from '@neondatabase/serverless';

/** Host que identifica la base local de Docker; con cualquier otro el driver queda intacto. */
const LOCAL_DATABASE_HOST = 'db.localtest.me';
const LOCAL_PROXY_PORT = 4444;

const connectionString = process.env.MAGASTORE_DB_POSTGRES_URL!;

const getHostname = (url: string | undefined): string => {
  try {
    return new URL(url ?? '').hostname;
  } catch {
    return '';
  }
};

// El driver de Neon solo habla con su propio proxy HTTP/WebSocket; en local se apunta al de Docker.
if (getHostname(connectionString) === LOCAL_DATABASE_HOST) {
  neonConfig.fetchEndpoint = (host) => `http://${host}:${LOCAL_PROXY_PORT}/sql`;
  neonConfig.useSecureWebSocket = false;
  neonConfig.wsProxy = (host) => `${host}:${LOCAL_PROXY_PORT}/v1`;
}

const sql = neon(connectionString);

export default sql;
