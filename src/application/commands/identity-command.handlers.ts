import { ApplicationError } from '../errors/application-error';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import { AuthorizationPolicy } from '../security/authorization.policy';
import type { UserRepositoryPort } from '../ports/user-repository.port';
import {
  assertActiveAccount,
  validateProfilePatch,
} from '../../domain/policies/profile.policy';
import {
  CreateUserCommand,
  UpdateUserCommand,
  SetUserStatusCommand,
  SendPasswordResetEmailCommand,
  UpdateMyProfileCommand,
} from './identity.commands';

export class CreateUserHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly auth: AuthorizationPolicy,
    /** Temporary: Keycloak forces the user to change it at first login. */
    private readonly defaultPassword: string,
  ) {}
  async execute(request: CreateUserCommand) {
    const { input, actor } = request;
    this.auth.management(actor);
    const account = await this.identity.create(input);
    try {
      await this.identity.setTemporaryPassword(
        account.userId,
        this.defaultPassword,
      );
    } catch {
      // The account exists but cannot log in yet; tell the caller which one.
      throw new ApplicationError(
        'ACCOUNT_CREATED_PASSWORD_FAILED',
        'Account created; default password could not be set',
        { userId: account.userId },
      );
    }
    return account;
  }
}
export class UpdateUserHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: UpdateUserCommand) {
    const { input, actor } = request;
    this.auth.management(actor);
    await this.identity.update(input.userId, input.patch);
  }
}
export class SetUserStatusHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: SetUserStatusCommand) {
    const { input, actor } = request;
    this.auth.management(actor);
    await this.identity.setEnabled(input.userId, input.enabled);
    if (!input.enabled) {
      try {
        await this.identity.logout(input.userId);
      } catch {
        throw new ApplicationError(
          'ACCOUNT_DISABLED_SESSION_FAILED',
          'Account disabled; session termination failed',
          { userId: input.userId },
        );
      }
    }
  }
}
export class SendPasswordResetEmailHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: SendPasswordResetEmailCommand) {
    const { input, actor } = request;
    this.auth.management(actor);
    await this.identity.sendPasswordReset(input.userId);
  }
}
export class UpdateMyProfileHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly profiles: UserRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute(request: UpdateMyProfileCommand) {
    const { input, actor } = request;
    this.auth.authenticated(actor);
    const account = await this.identity.get(actor.userId);
    assertActiveAccount(account);
    return this.profiles.update(actor.userId, validateProfilePatch(input));
  }
}
