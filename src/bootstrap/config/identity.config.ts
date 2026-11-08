export interface IdentityConfig {
  port: number;
  host: string;
  mongoUri: string;
  keycloakUrl: string;
  realm: string;
  clientId: string;
  clientSecret: string;
  issuer: string;
  timeoutMs: number;
}
export function loadIdentityConfig(env: NodeJS.ProcessEnv = process.env): IdentityConfig {
  const required = (key: string) => {
    const value = env[key]?.trim();
    if (!value) throw new Error(`${key} is required`);
    return value;
  };
  const url = (key: string) => {
    const value = required(key);
    let parsed: URL;
    try { parsed = new URL(value); } catch { throw new Error(`${key} must be a valid URL`); }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new Error(`${key} must be an HTTP(S) URL without credentials, query or fragment`);
    }
    return value.replace(/\/+$/, '');
  };
  const integer = (key: string, fallback: number, max: number) => {
    const raw = env[key] ?? String(fallback);
    if (!/^\d+$/.test(raw) || Number(raw) < 1 || Number(raw) > max) throw new Error(`${key} is invalid`);
    return Number(raw);
  };
  const mongoUri = required('MONGODB_URI');
  if (!/^mongodb(?:\+srv)?:\/\//.test(mongoUri)) throw new Error('MONGODB_URI must use mongodb or mongodb+srv');
  return {
    port: integer('PORT', 4002, 65535), host: env.IDENTITY_HOST ?? '127.0.0.1', mongoUri,
    keycloakUrl: url('KEYCLOAK_URL'), realm: required('KEYCLOAK_REALM'),
    clientId: required('KEYCLOAK_CLIENT_ID'), clientSecret: required('KEYCLOAK_CLIENT_SECRET'),
    issuer: url('KEYCLOAK_ISSUER'), timeoutMs: integer('KEYCLOAK_TIMEOUT_MS', 3000, 60000),
  };
}
