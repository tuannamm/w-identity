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
  ) {}
  async execute(request: CreateUserCommand) {
    const { input, actor } = request;
    this.auth.management(actor);
    return this.identity.create(input);
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
