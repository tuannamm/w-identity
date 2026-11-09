import { ApplicationError } from '../errors/application-error';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import type { PermissionRepositoryPort } from '../ports/permission-repository.port';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../ports/user-role-repository.port';
import { AuthorizationPolicy } from '../security/authorization.policy';
import { DomainError } from '../../domain/errors/domain-error';
import type { Role } from '../../domain/models/role';
import {
  assertMutableRole,
  isValidPermissionKey,
  isValidRoleName,
  validateRole,
  validateRolePatch,
} from '../../domain/policies/role.policy';
import {
  AssignRoleToUserCommand,
  CreateRoleCommand,
  DeleteRoleCommand,
  GrantPermissionToRoleCommand,
  RevokePermissionFromRoleCommand,
  UpdateRoleCommand,
} from './role.commands';

async function requireRole(
  roles: RoleRepositoryPort,
  name: string,
): Promise<Role> {
  if (!isValidRoleName(name))
    throw new DomainError('INVALID_ROLE', 'Invalid role name');
  const role = await roles.findByName(name);
  if (!role) throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
  return role;
}

export class CreateRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly permissions: PermissionRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: CreateRoleCommand) {
    this.auth.management(actor);
    const role = validateRole(input);
    const found = await this.permissions.findByKeys(role.permissionKeys);
    const missing = role.permissionKeys.filter(
      (key) => !found.some((permission) => permission.key === key),
    );
    if (missing.length)
      throw new ApplicationError(
        'PERMISSION_NOT_FOUND',
        'Permission not found',
        { permissionKeys: missing },
      );
    return this.roles.insert(role);
  }
}

export class UpdateRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: UpdateRoleCommand) {
    this.auth.management(actor);
    const role = await requireRole(this.roles, input.name);
    assertMutableRole(role);
    const updated = await this.roles.updateDescription(
      role.name,
      validateRolePatch(input.patch),
    );
    if (!updated)
      throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
    return updated;
  }
}

export class DeleteRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: DeleteRoleCommand) {
    this.auth.management(actor);
    const role = await requireRole(this.roles, input.name);
    assertMutableRole(role);
    if ((await this.userRoles.countByRole(role.name)) > 0)
      throw new ApplicationError('ROLE_IN_USE', 'Role is assigned to users');
    await this.roles.delete(role.name);
  }
}

export class GrantPermissionToRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly permissions: PermissionRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: GrantPermissionToRoleCommand) {
    this.auth.management(actor);
    const role = await requireRole(this.roles, input.name);
    assertMutableRole(role);
    if (!isValidPermissionKey(input.permissionKey))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    if (!(await this.permissions.findByKey(input.permissionKey)))
      throw new ApplicationError(
        'PERMISSION_NOT_FOUND',
        'Permission not found',
      );
    const updated = await this.roles.addPermission(
      role.name,
      input.permissionKey,
    );
    if (!updated)
      throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
    return updated;
  }
}

export class RevokePermissionFromRoleHandler {
  constructor(
    private readonly roles: RoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: RevokePermissionFromRoleCommand) {
    this.auth.management(actor);
    const role = await requireRole(this.roles, input.name);
    assertMutableRole(role);
    if (!isValidPermissionKey(input.permissionKey))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    const updated = await this.roles.removePermission(
      role.name,
      input.permissionKey,
    );
    if (!updated)
      throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
    return updated;
  }
}

export class AssignRoleToUserHandler {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: AssignRoleToUserCommand) {
    this.auth.management(actor);
    const role = await requireRole(this.roles, input.roleName);
    // Fails with the provider's not-found error for an unknown user.
    const account = await this.identity.get(input.userId);
    return this.userRoles.set(account.userId, role.name);
  }
}
