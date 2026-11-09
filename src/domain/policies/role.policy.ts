import { DomainError } from '../errors/domain-error';
import type { CreatePermission } from '../models/permission';
import type { CreateRole, Role, RolePatch, UserRole } from '../models/role';

export const DEFAULT_ROLE_NAME = 'user';
export const SYSTEM_ROLE_NAMES = ['admin', DEFAULT_ROLE_NAME] as const;

const PERMISSION_KEY = /^[a-z][a-z0-9-]*:[a-z][a-z0-9-]*$/;
const ROLE_NAME = /^[a-z][a-z0-9_-]{1,49}$/;
const MAX_DESCRIPTION = 255;

export function isSystemRoleName(name: string): boolean {
  return (SYSTEM_ROLE_NAMES as readonly string[]).includes(name);
}

export function isValidPermissionKey(key: unknown): key is string {
  return (
    typeof key === 'string' && key.length <= 100 && PERMISSION_KEY.test(key)
  );
}
export function isValidRoleName(name: unknown): name is string {
  return typeof name === 'string' && ROLE_NAME.test(name);
}

function description(
  value: unknown,
  error: 'INVALID_ROLE' | 'INVALID_PERMISSION',
) {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.length > MAX_DESCRIPTION
  )
    throw new DomainError(error, 'Invalid description');
  return value;
}

export function validatePermission(input: CreatePermission): CreatePermission {
  if (!isValidPermissionKey(input?.key))
    throw new DomainError(
      'INVALID_PERMISSION',
      'Permission key must look like resource:action',
    );
  return {
    key: input.key,
    ...(input.description !== undefined && {
      description: description(input.description, 'INVALID_PERMISSION'),
    }),
  };
}

/** Normalizes the key list (validated, de-duplicated, order preserved). */
export function normalizePermissionKeys(keys: unknown): string[] {
  if (!Array.isArray(keys))
    throw new DomainError('INVALID_ROLE', 'permissionKeys must be an array');
  const result: string[] = [];
  for (const key of keys) {
    if (!isValidPermissionKey(key))
      throw new DomainError('INVALID_PERMISSION', 'Invalid permission key');
    if (!result.includes(key)) result.push(key);
  }
  return result;
}

export function validateRole(
  input: CreateRole,
): Required<Pick<CreateRole, 'name' | 'permissionKeys'>> &
  Pick<CreateRole, 'description'> {
  if (!isValidRoleName(input?.name))
    throw new DomainError(
      'INVALID_ROLE',
      'Role name must be 2-50 chars: a-z, 0-9, _ or -, starting with a letter',
    );
  if (isSystemRoleName(input.name))
    throw new DomainError(
      'SYSTEM_ROLE_PROTECTED',
      'System role names are reserved',
    );
  return {
    name: input.name,
    permissionKeys: normalizePermissionKeys(input.permissionKeys ?? []),
    ...(input.description !== undefined && {
      description: description(input.description, 'INVALID_ROLE'),
    }),
  };
}

export function validateRolePatch(patch: RolePatch): RolePatch {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch))
    throw new DomainError('INVALID_ROLE', 'Invalid role');
  if (Object.keys(patch).some((key) => key !== 'description'))
    throw new DomainError('INVALID_ROLE', 'Unknown input field');
  if (patch.description === undefined)
    throw new DomainError(
      'INVALID_ROLE',
      'At least one role field is required',
    );
  return { description: description(patch.description, 'INVALID_ROLE') };
}

/** Throws for admin/user: they cannot be changed or removed. */
export function assertMutableRole(role: Pick<Role, 'system'>): void {
  if (role.system)
    throw new DomainError(
      'SYSTEM_ROLE_PROTECTED',
      'System roles cannot be modified or deleted',
    );
}

/** One role per user, so the effective permissions are exactly the role's. */
export function effectivePermissions(
  role: Pick<Role, 'permissionKeys'>,
): string[] {
  return [...new Set(role.permissionKeys)].sort();
}

/** Resolve the assigned role, defaulting to user. Missing roles fail closed. */
export function resolveEffectiveAccess(
  assignment: UserRole | null,
  roles: readonly Role[],
): { role: Role; permissions: string[] } {
  const role = roles.find(
    (item) => item.name === (assignment?.roleName ?? DEFAULT_ROLE_NAME),
  );
  if (!role) throw new DomainError('INVALID_ROLE', 'Assigned role not found');
  return { role, permissions: effectivePermissions(role) };
}
