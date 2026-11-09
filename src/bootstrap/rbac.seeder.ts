import {
  Inject,
  Injectable,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { PermissionRepositoryPort } from '../application/ports/permission-repository.port';
import type { RoleRepositoryPort } from '../application/ports/role-repository.port';
import { PERMISSION_REPOSITORY, ROLE_REPOSITORY } from './tokens';

export const DEFAULT_PERMISSIONS = [
  { key: 'users:read', description: 'View user accounts' },
  { key: 'users:write', description: 'Create and update user accounts' },
  { key: 'roles:read', description: 'View roles' },
  { key: 'roles:write', description: 'Create, update and delete roles' },
  { key: 'permissions:read', description: 'View permissions' },
  { key: 'permissions:write', description: 'Create and delete permissions' },
] as const;

/**
 * Seeds the immutable system roles and default permissions.
 * Idempotent: safe on every start and when several replicas boot together.
 */
@Injectable()
export class RbacSeeder implements OnApplicationBootstrap {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
  ) {}
  async onApplicationBootstrap() {
    for (const permission of DEFAULT_PERMISSIONS)
      await this.permissions.ensure(permission);
    await this.roles.ensureSystemRole({
      name: 'admin',
      description: 'Full access to identity management',
      permissionKeys: DEFAULT_PERMISSIONS.map((permission) => permission.key),
    });
    await this.roles.ensureSystemRole({
      name: 'user',
      description: 'Default role for every account',
      permissionKeys: [],
    });
  }
}
