import type { AccountPatch, CreateAccount, UserSearch } from '../../domain/models/user-account';
import type { ProfilePatch } from '../../domain/models/user-profile';
import { isApplicationRole } from '../../domain/policies/application-role.policy';
import { ApplicationError } from '../errors/application-error';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import type { UserProfileRepositoryPort } from '../ports/user-profile-repository.port';
import type { Actor } from '../security/actor';
import { AuthorizationPolicy } from '../security/authorization.policy';

export class CreateUser {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: CreateAccount, actor: Actor) {
    this.auth.admin(actor);
    const user = await this.identity.create(input);
    try { await this.identity.assignRole(user.userId, 'user'); }
    catch { throw new ApplicationError('ACCOUNT_CREATED_ROLE_FAILED', 'Account created; default role assignment failed', { userId: user.userId }); }
    return { ...user, roles: [...new Set([...user.roles, 'user'])] };
  }
}
export class ListUsers {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: UserSearch, actor: Actor) {
    this.auth.admin(actor);
    if (!Number.isInteger(input.offset) || input.offset < 0 || !Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) throw new ApplicationError('VALIDATION_ERROR', 'Invalid pagination');
    return { items: await this.identity.list(input), offset: input.offset, limit: input.limit };
  }
}
export class GetUser {
  constructor(private readonly identity: IdentityProviderPort, private readonly profiles: UserProfileRepositoryPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: { userId: string }, actor: Actor) {
    this.auth.admin(actor);
    const account = await this.identity.get(input.userId);
    return { ...account, profile: await this.profiles.getOrCreate(account.userId) };
  }
}
export class UpdateUser {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: { userId: string; patch: AccountPatch }, actor: Actor) {
    this.auth.admin(actor);
    await this.identity.update(input.userId, input.patch);
  }
}
export class SetUserStatus {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: { userId: string; enabled: boolean }, actor: Actor) {
    this.auth.admin(actor);
    await this.identity.setEnabled(input.userId, input.enabled);
    if (!input.enabled) {
      try { await this.identity.logout(input.userId); }
      catch { throw new ApplicationError('ACCOUNT_DISABLED_SESSION_FAILED', 'Account disabled; session termination failed', { userId: input.userId }); }
    }
  }
}
export class ListRoles {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(_input: unknown, actor: Actor) { this.auth.admin(actor); return { items: await this.identity.listRoles() }; }
}
export class AssignUserRole {
  constructor(protected readonly identity: IdentityProviderPort, protected readonly auth: AuthorizationPolicy) {}
  async execute(input: { userId: string; role: string }, actor: Actor) {
    this.auth.admin(actor);
    if (!isApplicationRole(input.role)) throw new ApplicationError('VALIDATION_ERROR', 'Unsupported application role');
    await this.identity.assignRole(input.userId, input.role);
  }
}
export class RemoveUserRole {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: { userId: string; role: string }, actor: Actor) {
    this.auth.admin(actor);
    if (!isApplicationRole(input.role)) throw new ApplicationError('VALIDATION_ERROR', 'Unsupported application role');
    await this.identity.removeRole(input.userId, input.role);
  }
}
export class SendPasswordResetEmail {
  constructor(private readonly identity: IdentityProviderPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: { userId: string }, actor: Actor) { this.auth.admin(actor); await this.identity.sendPasswordReset(input.userId); }
}
export class GetMe {
  constructor(private readonly identity: IdentityProviderPort, private readonly profiles: UserProfileRepositoryPort, private readonly auth: AuthorizationPolicy) {}
  async execute(_input: unknown, actor: Actor) {
    this.auth.authenticated(actor);
    const account = await this.identity.get(actor.userId);
    if (!account.enabled) throw new ApplicationError('FORBIDDEN', 'Account is disabled');
    return { ...account, profile: await this.profiles.getOrCreate(actor.userId) };
  }
}
export class UpdateMyProfile {
  constructor(private readonly identity: IdentityProviderPort, private readonly profiles: UserProfileRepositoryPort, private readonly auth: AuthorizationPolicy) {}
  async execute(input: ProfilePatch, actor: Actor) {
    this.auth.authenticated(actor);
    const account = await this.identity.get(actor.userId);
    if (!account.enabled) throw new ApplicationError('FORBIDDEN', 'Account is disabled');
    return this.profiles.update(actor.userId, input);
  }
}
