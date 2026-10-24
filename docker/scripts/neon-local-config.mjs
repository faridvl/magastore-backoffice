/**
 * Precarga (`node --import`) para que .github/scripts/migrate.mjs hable con el proxy
 * local de Docker en vez del de Neon. El script real no se modifica: solo se
 * configura el driver antes de que lo use. Debe reflejar src/lib/db.ts.
 */
import { neonConfig } from '@neondatabase/serverless';

const LOCAL_PROXY_PORT = 4444;

neonConfig.useSecureWebSocket = false;
neonConfig.wsProxy = (host) => `${host}:${LOCAL_PROXY_PORT}/v1`;
neonConfig.fetchEndpoint = (host) => `http://${host}:${LOCAL_PROXY_PORT}/sql`;
