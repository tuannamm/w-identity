import { ApplicationError } from '../errors/application-error';
import type { PermissionRepositoryPort } from '../ports/permission-repository.port';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import { AuthorizationPolicy } from '../security/authorization.policy';
import {
  isValidPermissionKey,
  validatePermission,
} from '../../domain/policies/role.policy';
import { DomainError } from '../../domain/errors/domain-error';
import {
  CreatePermissionCommand,
  DeletePermissionCommand,
} from './permission.commands';

export class CreatePermissionHandler {
  constructor(
    private readonly permissions: PermissionRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: CreatePermissionCommand) {
    this.auth.management(actor);
    return this.permissions.insert(validatePermission(input));
  }
}

export class DeletePermissionHandler {
  constructor(
    private readonly permissions: PermissionRepositoryPort,
    private readonly roles: RoleRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: DeletePermissionCommand) {
    this.auth.management(actor);
    if (!isValidPermissionKey(input.key))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    if (!(await this.permissions.findByKey(input.key)))
      throw new ApplicationError(
        'PERMISSION_NOT_FOUND',
        'Permission not found',
      );
    if ((await this.roles.countByPermission(input.key)) > 0)
      throw new ApplicationError(
        'PERMISSION_IN_USE',
        'Permission is granted to a role',
      );
    await this.permissions.delete(input.key);
  }
}
