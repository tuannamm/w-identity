import type {
  AccountPatch,
  CreateAccount,
  UserAccount,
  UserSearch,
} from '../../domain/models/user-account';
import type { IdentityProviderPort } from '../../application/ports/identity-provider.port';
import { ApplicationError } from '../../application/errors/application-error';
import { KeycloakHttpClient } from '@lib-infrastructure/keycloak';
import { mapKeycloakError } from './keycloak-error';
interface Representation {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified?: boolean;
}
export class KeycloakIdentityAdapter implements IdentityProviderPort {
  constructor(private readonly http: KeycloakHttpClient) {}
  private async request(path: string, method = 'GET', body?: unknown) {
    try {
      return await this.http.request(path, method, body);
    } catch (error) {
      return mapKeycloakError(error);
    }
  }
  private async json<T>(path: string): Promise<T> {
    try {
      return await this.http.json<T>(path);
    } catch (error) {
      return mapKeycloakError(error);
    }
  }
  private async command(path: string, method: string, body?: unknown) {
    try {
      return await this.http.command(path, method, body);
    } catch (error) {
      return mapKeycloakError(error);
    }
  }
  private userPath(id: string) {
    return `/users/${encodeURIComponent(id)}`;
  }
  private map(user: Representation): UserAccount {
    return {
      userId: user.id,
      username: user.username,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      enabled: user.enabled,
      emailVerified: user.emailVerified ?? false,
    };
  }
  async create(input: CreateAccount) {
    const response = await this.request('/users', 'POST', {
      ...input,
      enabled: true,
      emailVerified: false,
      requiredActions: ['UPDATE_PASSWORD'],
    });
    const location = response.headers.get('location');
    await response.body?.cancel();
    const id = location?.split('/').pop();
    if (!id)
      throw new ApplicationError(
        'OPERATION_UNCERTAIN',
        'Account may have been created; missing identifier',
      );
    return this.map({ id: decodeURIComponent(id), ...input, enabled: true });
  }
  async get(id: string) {
    const user = await this.json<Representation>(this.userPath(id));
    return this.map(user);
  }
  async list(input: UserSearch) {
    const query = new URLSearchParams({
      first: String(input.offset),
      max: String(input.limit),
      briefRepresentation: 'false',
    });
    if (input.search !== undefined) query.set('search', input.search);
    if (input.enabled !== undefined)
      query.set('enabled', String(input.enabled));
    const users = await this.json<Representation[]>(`/users?${query}`);
    return users.map((user) => this.map(user));
  }
  async update(id: string, input: AccountPatch) {
    const current = await this.json<Representation>(this.userPath(id));
    await this.command(this.userPath(id), 'PUT', {
      ...input,
      ...(input.email !== undefined && input.email !== current.email
        ? { emailVerified: false }
        : {}),
    });
  }
  async setEnabled(id: string, enabled: boolean) {
    await this.command(this.userPath(id), 'PUT', { enabled });
  }
  async logout(id: string) {
    await this.command(`${this.userPath(id)}/logout`, 'POST');
  }
  async sendPasswordReset(id: string) {
    await this.command(`${this.userPath(id)}/execute-actions-email`, 'PUT', [
      'UPDATE_PASSWORD',
    ]);
  }
}
