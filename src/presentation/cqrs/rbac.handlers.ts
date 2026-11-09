import { AccessResolver } from '../../application/security/access-resolver';
import * as AccessQueries from '../../application/queries/access.queries';
import * as AccessHandlers from '../../application/queries/access-query.handlers';
import { Inject } from '@nestjs/common';
import { CommandHandler, QueryHandler } from '@nestjs/cqrs';
import * as PermissionCommands from '../../application/commands/permission.commands';
import * as PermissionCommandHandlers from '../../application/commands/permission-command.handlers';
import * as RoleCommands from '../../application/commands/role.commands';
import * as RoleCommandHandlers from '../../application/commands/role-command.handlers';
import * as PermissionQueries from '../../application/queries/permission.queries';
import * as PermissionQueryHandlers from '../../application/queries/permission-query.handlers';
import * as RoleQueries from '../../application/queries/role.queries';
import * as RoleQueryHandlers from '../../application/queries/role-query.handlers';
import type { IdentityProviderPort } from '../../application/ports/identity-provider.port';
import type { PermissionRepositoryPort } from '../../application/ports/permission-repository.port';
import type { RoleRepositoryPort } from '../../application/ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../../application/ports/user-role-repository.port';
import { AuthorizationPolicy } from '../../application/security/authorization.policy';
import {
  IDENTITY_PROVIDER,
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from '../../bootstrap/tokens';

// Nest adapters only register and inject the pure Application handlers.

@CommandHandler(PermissionCommands.CreatePermissionCommand)
export class NestCreatePermissionHandler
  extends PermissionCommandHandlers.CreatePermissionHandler
{
  constructor(
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(permissions, auth);
  }
}
@CommandHandler(PermissionCommands.DeletePermissionCommand)
export class NestDeletePermissionHandler
  extends PermissionCommandHandlers.DeletePermissionHandler
{
  constructor(
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(permissions, roles, auth);
  }
}
@CommandHandler(RoleCommands.CreateRoleCommand)
export class NestCreateRoleHandler
  extends RoleCommandHandlers.CreateRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, permissions, auth);
  }
}
@CommandHandler(RoleCommands.UpdateRoleCommand)
export class NestUpdateRoleHandler
  extends RoleCommandHandlers.UpdateRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, auth);
  }
}
@CommandHandler(RoleCommands.DeleteRoleCommand)
export class NestDeleteRoleHandler
  extends RoleCommandHandlers.DeleteRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, userRoles, auth);
  }
}
@CommandHandler(RoleCommands.GrantPermissionToRoleCommand)
export class NestGrantPermissionToRoleHandler
  extends RoleCommandHandlers.GrantPermissionToRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, permissions, auth);
  }
}
@CommandHandler(RoleCommands.RevokePermissionFromRoleCommand)
export class NestRevokePermissionFromRoleHandler
  extends RoleCommandHandlers.RevokePermissionFromRoleHandler
{
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, auth);
  }
}
@CommandHandler(RoleCommands.AssignRoleToUserCommand)
export class NestAssignRoleToUserHandler
  extends RoleCommandHandlers.AssignRoleToUserHandler
{
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, roles, userRoles, auth);
  }
}

@QueryHandler(PermissionQueries.ListPermissionsQuery)
export class NestListPermissionsHandler
  extends PermissionQueryHandlers.ListPermissionsHandler
{
  constructor(
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(permissions, auth);
  }
}
@QueryHandler(PermissionQueries.GetPermissionQuery)
export class NestGetPermissionHandler
  extends PermissionQueryHandlers.GetPermissionHandler
{
  constructor(
    @Inject(PERMISSION_REPOSITORY) permissions: PermissionRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(permissions, auth);
  }
}
@QueryHandler(RoleQueries.ListRolesQuery)
export class NestListRolesHandler extends RoleQueryHandlers.ListRolesHandler {
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, auth);
  }
}
@QueryHandler(RoleQueries.GetRoleQuery)
export class NestGetRoleHandler extends RoleQueryHandlers.GetRoleHandler {
  constructor(
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(roles, auth);
  }
}
@QueryHandler(RoleQueries.GetUserRoleQuery)
export class NestGetUserRoleHandler
  extends RoleQueryHandlers.GetUserRoleHandler
{
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, roles, userRoles, auth);
  }
}
@QueryHandler(RoleQueries.GetUserPermissionsQuery)
export class NestGetUserPermissionsHandler
  extends RoleQueryHandlers.GetUserPermissionsHandler
{
  constructor(
    @Inject(IDENTITY_PROVIDER) identity: IdentityProviderPort,
    @Inject(ROLE_REPOSITORY) roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY) userRoles: UserRoleRepositoryPort,
    auth: AuthorizationPolicy,
  ) {
    super(identity, roles, userRoles, auth);
  }
}

@QueryHandler(AccessQueries.GetMyAccessQuery)
export class NestGetMyAccessHandler extends AccessHandlers.GetMyAccessHandler {
  constructor(access: AccessResolver, auth: AuthorizationPolicy) {
    super(access, auth);
  }
}
@QueryHandler(AccessQueries.ResolveUserAccessQuery)
export class NestResolveUserAccessHandler
  extends AccessHandlers.ResolveUserAccessHandler
{
  constructor(access: AccessResolver) {
    super(access);
  }
}
export const RbacCqrsHandlers = [
  NestGetMyAccessHandler,
  NestResolveUserAccessHandler,
  NestCreatePermissionHandler,
  NestDeletePermissionHandler,
  NestCreateRoleHandler,
  NestUpdateRoleHandler,
  NestDeleteRoleHandler,
  NestGrantPermissionToRoleHandler,
  NestRevokePermissionFromRoleHandler,
  NestAssignRoleToUserHandler,
  NestListPermissionsHandler,
  NestGetPermissionHandler,
  NestListRolesHandler,
  NestGetRoleHandler,
  NestGetUserRoleHandler,
  NestGetUserPermissionsHandler,
];
