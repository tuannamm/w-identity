import { ApplicationError } from '../errors/application-error';
import type { PermissionRepositoryPort } from '../ports/permission-repository.port';
import { AuthorizationPolicy } from '../security/authorization.policy';
import { DomainError } from '../../domain/errors/domain-error';
import { isValidPermissionKey } from '../../domain/policies/role.policy';
import { GetPermissionQuery, ListPermissionsQuery } from './permission.queries';

export class ListPermissionsHandler {
  constructor(
    private readonly permissions: PermissionRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ actor }: ListPermissionsQuery) {
    this.auth.management(actor);
    return { items: await this.permissions.list() };
  }
}

export class GetPermissionHandler {
  constructor(
    private readonly permissions: PermissionRepositoryPort,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ input, actor }: GetPermissionQuery) {
    this.auth.management(actor);
    if (!isValidPermissionKey(input.key))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    const permission = await this.permissions.findByKey(input.key);
    if (!permission)
      throw new ApplicationError(
        'PERMISSION_NOT_FOUND',
        'Permission not found',
      );
    return permission;
  }
}
