import type { UserRole } from '../../domain/models/role';

export interface UserRoleRepositoryPort {
  findByUserId(userId: string): Promise<UserRole | null>;
  /** Replaces the user's role (upsert), so it is idempotent. */
  set(userId: string, roleName: string): Promise<UserRole>;
  countByRole(roleName: string): Promise<number>;
}
