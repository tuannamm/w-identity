import type {
  CreatePermission,
  Permission,
} from '../../domain/models/permission';

export interface PermissionRepositoryPort {
  /** Rejects with ApplicationError PERMISSION_CONFLICT when the key exists. */
  insert(input: CreatePermission): Promise<Permission>;
  /** Idempotent upsert used by bootstrap seeding. */
  ensure(input: CreatePermission): Promise<void>;
  findByKey(key: string): Promise<Permission | null>;
  findByKeys(keys: string[]): Promise<Permission[]>;
  list(): Promise<Permission[]>;
  delete(key: string): Promise<boolean>;
}
