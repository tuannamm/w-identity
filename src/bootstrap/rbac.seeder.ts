import {
  Inject,
  Injectable,
  Optional,
  type OnApplicationBootstrap,
} from '@nestjs/common';
import type { PermissionRepositoryPort } from '../application/ports/permission-repository.port';
import type { RoleRepositoryPort } from '../application/ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../application/ports/user-role-repository.port';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from './tokens';

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
 * Runs at every start (and in the seed-admin script). Idempotent: safe on every start and when several replicas boot together.
 */
@Injectable()
export class RbacSeeder implements OnApplicationBootstrap {
  constructor(
    @Inject(PERMISSION_REPOSITORY)
    private readonly permissions: PermissionRepositoryPort,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
    // Not a DI token: @Optional lets Nest pass undefined so the env default applies.
    @Optional()
    private readonly bootstrapAdminUserId: string | undefined = process.env
      .BOOTSTRAP_ADMIN_USER_ID,
  ) {}
  onApplicationBootstrap() {
    return this.seed();
  }
  async seed() {
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
    // The first admin cannot be assigned through the API (assigning needs an
    // admin), so a Keycloak user id from the environment is promoted at boot.
    const adminId = this.bootstrapAdminUserId?.trim();
    if (adminId) await this.userRoles.set(adminId, 'admin');
  }
}
