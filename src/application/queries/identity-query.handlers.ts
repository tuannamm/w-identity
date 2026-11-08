import { ApplicationError } from '../errors/application-error';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import { AuthorizationPolicy } from '../security/authorization.policy';
import type { UserRepositoryPort } from '../ports/user-repository.port';
import { assertActiveAccount } from '../../domain/policies/profile.policy';
import { ListUsersQuery, GetUserQuery, GetMeQuery } from './identity.queries';

export class ListUsersHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: ListUsersQuery) {
    const { input, actor } = request;
    this.auth.management(actor);
    if (
      !Number.isInteger(input.offset) ||
      input.offset < 0 ||
      !Number.isInteger(input.limit) ||
      input.limit < 1 ||
      input.limit > 100
    )
      throw new ApplicationError('VALIDATION_ERROR', 'Invalid pagination');
    return {
      items: await this.identity.list(input),
      offset: input.offset,
      limit: input.limit,
    };
  }
}
export class GetUserHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly profiles: UserRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: GetUserQuery) {
    const { input, actor } = request;
    this.auth.management(actor);
    const account = await this.identity.get(input.userId);
    return {
      ...account,
      profile: await this.profiles.findByUserId(account.userId),
    };
  }
}
export class GetMeHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly profiles: UserRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: GetMeQuery) {
    const { actor } = request;
    this.auth.authenticated(actor);
    const account = await this.identity.get(actor.userId);
    assertActiveAccount(account);
    return {
      ...account,
      profile: await this.profiles.findByUserId(actor.userId),
    };
  }
}
