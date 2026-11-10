import { Inject, Injectable } from '@nestjs/common';
import type { IdentityProviderPort } from '../application/ports/identity-provider.port';
import type { RoleRepositoryPort } from '../application/ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../application/ports/user-role-repository.port';
import {
  IDENTITY_PROVIDER,
  ROLE_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from './tokens';

export interface AdminSeedConfig {
  username: string;
  email: string;
  /** Temporary: Keycloak forces a change at first login. Never logged. */
  password: string;
}
export type AdminSeedSettings =
  | { status: 'missing' }
  | { status: 'invalid'; problem: string }
  | { status: 'enabled'; config: AdminSeedConfig };

/** Reads SEED_ADMIN_USERNAME / _EMAIL / _PASSWORD for the seed-admin script. */
export function readAdminSeedSettings(
  read: (key: string) => string | undefined,
): AdminSeedSettings {
  const username = read('SEED_ADMIN_USERNAME')?.trim();
  if (!username) return { status: 'missing' };
  const email = read('SEED_ADMIN_EMAIL')?.trim();
  const password = read('SEED_ADMIN_PASSWORD');
  if (!email || !password)
    return {
      status: 'invalid',
      problem: 'SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required',
    };
  if (username.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { status: 'invalid', problem: 'Invalid username or email' };
  if (password.length < 3 || password.length > 128)
    return {
      status: 'invalid',
      problem: 'SEED_ADMIN_PASSWORD must be 3-128 characters',
    };
  return { status: 'enabled', config: { username, email, password } };
}

/**
 * Ensures one bootstrap admin exists (run by `npm run seed:admin`). Idempotent:
 * - user missing in Keycloak → create, set temporary password, assign admin;
 * - user exists → never touch the password; assign admin only if the user has
 *   no role yet, so a deliberate demotion is not undone on the next boot.
 */
@Injectable()
export class AdminSeeder {
  constructor(
    @Inject(IDENTITY_PROVIDER) private readonly identity: IdentityProviderPort,
    @Inject(ROLE_REPOSITORY) private readonly roles: RoleRepositoryPort,
    @Inject(USER_ROLE_REPOSITORY)
    private readonly userRoles: UserRoleRepositoryPort,
  ) {}

  async seed(
    config: AdminSeedConfig,
  ): Promise<{ userId: string; created: boolean }> {
    // The admin role comes from RbacSeeder, which must have run first.
    if (!(await this.roles.findByName('admin')))
      throw new Error('Admin role is missing; run RBAC seeding first');
    const existing = await this.identity.findByUsername(config.username);
    let userId: string;
    if (existing) userId = existing.userId;
    else {
      userId = (
        await this.identity.create({
          username: config.username,
          email: config.email,
        })
      ).userId;
      try {
        await this.identity.setTemporaryPassword(userId, config.password);
      } catch {
        throw new Error(
          'Admin account was created but its initial password was not set; send a password reset email',
        );
      }
    }
    if (!(await this.userRoles.findByUserId(userId)))
      await this.userRoles.set(userId, 'admin');
    return { userId, created: !existing };
  }
}
