import { AccessResolver } from '../security/access-resolver';
import { ApplicationError } from '../errors/application-error';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../ports/user-role-repository.port';
import { AuthorizationPolicy } from '../security/authorization.policy';
import { DomainError } from '../../domain/errors/domain-error';
import type { Role } from '../../domain/models/role';
import {
  DEFAULT_ROLE_NAME,
  isValidRoleName,
} from '../../domain/policies/role.policy';
import {
  GetRoleQuery,
  GetUserPermissionsQuery,
  GetUserRoleQuery,
  ListRolesQuery,
} from './role.queries';

export class ListRolesHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ actor }: ListRolesQuery) {
    this.auth.management(actor);
    return { items: await this.roles.list() };
  }
}

export class GetRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: GetRoleQuery) {
    this.auth.management(actor);
    if (!isValidRoleName(input.name))
      throw new DomainError('INVALID_ROLE', 'Invalid role name');
    const role = await this.roles.findByName(input.name);
    if (!role) throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
    return role;
  }
}

/** A user without a stored assignment holds the default role. */
async function resolveUserRole(
  identity: IdentityProviderPort,
  roles: RoleRepositoryPort,
  userRoles: UserRoleRepositoryPort,
  userId: string,
): Promise<{ userId: string; role: Role }> {
  const account = await identity.get(userId);
  const assigned = await userRoles.findByUserId(account.userId);
  const role = await roles.findByName(assigned?.roleName ?? DEFAULT_ROLE_NAME);
  if (!role) throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
  return { userId: account.userId, role };
}

export class GetUserRoleHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: GetUserRoleQuery) {
    this.auth.management(actor);
    const { userId, role } = await resolveUserRole(
      this.identity,
      this.roles,
      this.userRoles,
      input.userId,
    );
    return { userId, role };
  }
}

export class GetUserPermissionsHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: GetUserPermissionsQuery) {
    this.auth.management(actor);
    const { userId, role, permissions } = await new AccessResolver(
      this.identity,
      this.roles,
      this.userRoles,
    ).resolve(input.userId, true);
    return { userId, roleName: role!.name, permissions };
  }
}
