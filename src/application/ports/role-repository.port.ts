import type { Role, RolePatch } from '../../domain/models/role';

export interface RoleRepositoryPort {
  /** Rejects with ApplicationError ROLE_CONFLICT when the name exists. */
  insert(input: {
    name: string;
    description?: string;
    permissionKeys: string[];
  }): Promise<Role>;
  /** Idempotent bootstrap upsert of an immutable system role; only adds permissions. */
  ensureSystemRole(input: {
    name: string;
    description?: string;
    permissionKeys: string[];
  }): Promise<void>;
  findByName(name: string): Promise<Role | null>;
  list(): Promise<Role[]>;
  updateDescription(name: string, patch: RolePatch): Promise<Role | null>;
  delete(name: string): Promise<boolean>;
  /** Atomic and idempotent. Null when the role does not exist. */
  addPermission(name: string, key: string): Promise<Role | null>;
  removePermission(name: string, key: string): Promise<Role | null>;
  countByPermission(key: string): Promise<number>;
}
