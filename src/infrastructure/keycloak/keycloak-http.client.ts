import { ApplicationError } from '../../application/errors/application-error';
export interface KeycloakConnection { keycloakUrl: string; realm: string; clientId: string; clientSecret: string; timeoutMs: number }
export class KeycloakTokenProvider {
  private cached?: { token: string; expires: number };
  private pending?: Promise<string>;
  constructor(private readonly config: KeycloakConnection, private readonly fetcher: typeof fetch = fetch) {}
  invalidate(token: string) { if (this.cached?.token === token) this.cached = undefined; }
  async get(): Promise<string> {
    if (this.cached && this.cached.expires > Date.now()) return this.cached.token;
    if (this.pending) return this.pending;
    this.pending = this.load();
    try { return await this.pending; } finally { this.pending = undefined; }
  }
  private async load() {
    try {
      const response = await this.fetcher(`${this.config.keycloakUrl}/realms/${encodeURIComponent(this.config.realm)}/protocol/openid-connect/token`, {
        method: 'POST', signal: AbortSignal.timeout(this.config.timeoutMs),
        headers: { 'content-type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'client_credentials', client_id: this.config.clientId, client_secret: this.config.clientSecret }),
      });
      if (!response.ok) throw new Error('token failed');
      const data = await response.json() as { access_token?: string; expires_in?: number };
      if (!data.access_token || !data.expires_in) throw new Error('invalid token response');
      this.cached = { token: data.access_token, expires: Date.now() + Math.max(0, data.expires_in - 15) * 1000 };
      return data.access_token;
    } catch { throw new ApplicationError('DEPENDENCY_UNAVAILABLE', 'Identity provider authentication unavailable'); }
  }
}
export class KeycloakHttpClient {
  private readonly tokens: KeycloakTokenProvider;
  constructor(private readonly config: KeycloakConnection, private readonly fetcher: typeof fetch = fetch) { this.tokens = new KeycloakTokenProvider(config, fetcher); }
  async request(path: string, method = 'GET', body?: unknown): Promise<Response> {
    for (let attempt = 0; attempt < 2; attempt++) {
      const token = await this.tokens.get();
      let response: Response;
      try {
        response = await this.fetcher(`${this.config.keycloakUrl}/admin/realms/${encodeURIComponent(this.config.realm)}${path}`, {
          method, signal: AbortSignal.timeout(this.config.timeoutMs), headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
          ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        });
      } catch {
        throw new ApplicationError(method === 'GET' ? 'DEPENDENCY_UNAVAILABLE' : 'OPERATION_UNCERTAIN', method === 'GET' ? 'Identity provider unavailable' : 'Identity operation result is unknown; reconcile before retrying');
      }
      if (response.status === 401 && attempt === 0) { await response.body?.cancel(); this.tokens.invalidate(token); continue; }
      if (response.ok) return response;
      const status = response.status;
      await response.body?.cancel();
      if (status === 404) throw new ApplicationError('USER_NOT_FOUND', 'User not found');
      if (status === 409) throw new ApplicationError('ACCOUNT_CONFLICT', 'Username or email already exists');
      if (status === 400) throw new ApplicationError('VALIDATION_ERROR', 'Identity provider rejected account data');
      if (status === 401 || status === 403) throw new ApplicationError('DEPENDENCY_FORBIDDEN', 'Identity service account lacks required permissions');
      throw new ApplicationError('DEPENDENCY_UNAVAILABLE', 'Identity provider operation failed');
    }
    throw new ApplicationError('DEPENDENCY_UNAVAILABLE', 'Identity provider authentication failed');
  }
  async json<T>(path: string): Promise<T> {
    try { return await (await this.request(path)).json() as T; }
    catch (error) { if (error instanceof ApplicationError) throw error; throw new ApplicationError('DEPENDENCY_UNAVAILABLE', 'Invalid identity provider response'); }
  }
  async command(path: string, method: string, body?: unknown) { const response = await this.request(path, method, body); await response.body?.cancel(); }
}
