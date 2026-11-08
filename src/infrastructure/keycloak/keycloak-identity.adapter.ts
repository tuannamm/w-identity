import type { AccountPatch, CreateAccount, UserAccount, UserSearch } from '../../domain/models/user-account';
import { APPLICATION_ROLES, type ApplicationRole } from '../../domain/policies/application-role.policy';
import type { IdentityProviderPort } from '../../application/ports/identity-provider.port';
import { ApplicationError } from '../../application/errors/application-error';
import { KeycloakHttpClient } from './keycloak-http.client';
interface Representation { id: string; username: string; email?: string; firstName?: string; lastName?: string; enabled: boolean; emailVerified?: boolean }
interface Role { id: string; name: string }
export class KeycloakIdentityAdapter implements IdentityProviderPort {
  constructor(private readonly http: KeycloakHttpClient) {}
  private userPath(id: string) { return `/users/${encodeURIComponent(id)}`; }
  private map(user: Representation, roles: Role[] = []): UserAccount {
    return { userId: user.id, username: user.username, email: user.email, firstName: user.firstName, lastName: user.lastName,
      enabled: user.enabled, emailVerified: user.emailVerified ?? false, roles: roles.map(r => r.name).filter(r => APPLICATION_ROLES.includes(r as ApplicationRole)) };
  }
  async create(input: CreateAccount) {
    const response = await this.http.request('/users', 'POST', { ...input, enabled: true, emailVerified: false, requiredActions: ['UPDATE_PASSWORD'] });
    const location = response.headers.get('location'); await response.body?.cancel();
    const id = location?.split('/').pop();
    if (!id) throw new ApplicationError('OPERATION_UNCERTAIN', 'Account may have been created; missing identifier');
    return this.map({ id: decodeURIComponent(id), ...input, enabled: true });
  }
  async get(id: string) {
    const user = await this.http.json<Representation>(this.userPath(id));
    const roles = await this.http.json<Role[]>(`${this.userPath(id)}/role-mappings/realm/composite`);
    return this.map(user, roles);
  }
  async list(input: UserSearch) {
    const query = new URLSearchParams({ first: String(input.offset), max: String(input.limit), briefRepresentation: 'false' });
    if (input.search !== undefined) query.set('search', input.search);
    if (input.enabled !== undefined) query.set('enabled', String(input.enabled));
    const users = await this.http.json<Representation[]>(`/users?${query}`);
    // Bounded batches avoid flooding Keycloak for large pages.
    const result: UserAccount[] = [];
    for (let i = 0; i < users.length; i += 5) {
      result.push(...await Promise.all(users.slice(i, i + 5).map(async user => this.map(user, await this.http.json<Role[]>(`${this.userPath(user.id)}/role-mappings/realm/composite`)))));
    }
    return result;
  }
  async update(id: string, input: AccountPatch) {
    const current = await this.http.json<Representation>(this.userPath(id));
    await this.http.command(this.userPath(id), 'PUT', { ...input, ...(input.email !== undefined && input.email !== current.email ? { emailVerified: false } : {}) });
  }
  async setEnabled(id: string, enabled: boolean) { await this.http.command(this.userPath(id), 'PUT', { enabled }); }
  async logout(id: string) { await this.http.command(`${this.userPath(id)}/logout`, 'POST'); }
  async listRoles() { const roles = await this.http.json<Role[]>('/roles'); return APPLICATION_ROLES.filter(r => roles.some(role => role.name === r)); }
  private async role(name: ApplicationRole) { return this.http.json<Role>(`/roles/${encodeURIComponent(name)}`); }
  async assignRole(id: string, role: ApplicationRole) { await this.http.command(`${this.userPath(id)}/role-mappings/realm`, 'POST', [await this.role(role)]); }
  async removeRole(id: string, role: ApplicationRole) { await this.http.command(`${this.userPath(id)}/role-mappings/realm`, 'DELETE', [await this.role(role)]); }
  async sendPasswordReset(id: string) { await this.http.command(`${this.userPath(id)}/execute-actions-email`, 'PUT', ['UPDATE_PASSWORD']); }
}
