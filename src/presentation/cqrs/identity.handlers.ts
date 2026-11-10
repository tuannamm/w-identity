import { Inject } from '@nestjs/common';
import { CommandHandler, QueryHandler } from '@nestjs/cqrs';
import * as Commands from '../../application/commands/identity.commands';
import * as CommandHandlers from '../../application/commands/identity-command.handlers';
import * as Queries from '../../application/queries/identity.queries';
import * as QueryHandlers from '../../application/queries/identity-query.handlers';
import type { IdentityProviderPort } from '../../application/ports/identity-provider.port';
import type { UserRepositoryPort } from '../../application/ports/user-repository.port';
import { AuthorizationPolicy } from '../../application/security/authorization.policy';
import {
  DEFAULT_USER_PASSWORD,
  IDENTITY_PROVIDER,
  USER_REPOSITORY,
} from '../../bootstrap/tokens';

// Nest adapters only register and inject the pure Application handlers.

@CommandHandler(Commands.CreateUserCommand)
export class NestCreateUserHandler extends CommandHandlers.CreateUserHandler {
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    auth: AuthorizationPolicy,
    @Inject(DEFAULT_USER_PASSWORD) defaultPassword: string,
  ) {
    super(identity, auth, defaultPassword);
  }
}

@CommandHandler(Commands.UpdateUserCommand)
export class NestUpdateUserHandler extends CommandHandlers.UpdateUserHandler {
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, auth);
  }
}

@CommandHandler(Commands.SetUserStatusCommand)
export class NestSetUserStatusHandler
  extends CommandHandlers.SetUserStatusHandler
{
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, auth);
  }
}

@CommandHandler(Commands.SendPasswordResetEmailCommand)
export class NestSendPasswordResetEmailHandler
  extends CommandHandlers.SendPasswordResetEmailHandler
{
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, auth);
  }
}

@CommandHandler(Commands.UpdateMyProfileCommand)
export class NestUpdateMyProfileHandler
  extends CommandHandlers.UpdateMyProfileHandler
{
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    @Inject(USER_REPOSITORY) profiles: UserRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, profiles, auth);
  }
}

@QueryHandler(Queries.ListUsersQuery)
export class NestListUsersHandler extends QueryHandlers.ListUsersHandler {
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, auth);
  }
}

@QueryHandler(Queries.GetUserQuery)
export class NestGetUserHandler extends QueryHandlers.GetUserHandler {
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    @Inject(USER_REPOSITORY) profiles: UserRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, profiles, auth);
  }
}

@QueryHandler(Queries.GetMeQuery)
export class NestGetMeHandler extends QueryHandlers.GetMeHandler {
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    @Inject(USER_REPOSITORY) profiles: UserRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, profiles, auth);
  }
}

export const IdentityCqrsHandlers = [
  NestCreateUserHandler,
  NestUpdateUserHandler,
  NestSetUserStatusHandler,
  NestSendPasswordResetEmailHandler,
  NestUpdateMyProfileHandler,
  NestListUsersHandler,
  NestGetUserHandler,
  NestGetMeHandler,
];
