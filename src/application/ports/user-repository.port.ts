import type { ProfilePatch, User } from '../../domain/models/user';

/** Shared persistence contract for command and query handlers. */
export interface UserRepositoryPort {
  findByUserId(userId: string): Promise<User | null>;
  update(userId: string, patch: ProfilePatch): Promise<User>;
}
