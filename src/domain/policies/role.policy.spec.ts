import {
  assertMutableRole,
  effectivePermissions,
  normalizePermissionKeys,
  validatePermission,
  validateRole,
  validateRolePatch,
} from './role.policy';

describe('role policy', () => {
  it.each(['users:read', 'project-tasks:create'])('accepts key %s', (key) => {
    expect(validatePermission({ key })).toEqual({ key });
  });
  it.each(['users', 'Users:read', 'users:', ':read', 'a:b:c', '', 'x y:z'])(
    'rejects key %j',
    (key) => {
      expect(() => validatePermission({ key })).toThrow(
        expect.objectContaining({ code: 'INVALID_PERMISSION' }),
      );
    },
  );
  it('rejects a blank description', () => {
    expect(() => validatePermission({ key: 'a:b', description: ' ' })).toThrow(
      expect.objectContaining({ code: 'INVALID_PERMISSION' }),
    );
  });
  it('validates a role and de-duplicates permission keys', () => {
    expect(
      validateRole({ name: 'editor', permissionKeys: ['a:b', 'a:b', 'c:d'] }),
    ).toEqual({ name: 'editor', permissionKeys: ['a:b', 'c:d'] });
    expect(validateRole({ name: 'editor' }).permissionKeys).toEqual([]);
  });
  it.each(['', 'A', 'a', '1abc', 'has space', 'x'.repeat(51)])(
    'rejects role name %j',
    (name) => {
      expect(() => validateRole({ name })).toThrow(
        expect.objectContaining({ code: 'INVALID_ROLE' }),
      );
    },
  );
  it.each(['admin', 'user'])('reserves system name %s', (name) => {
    expect(() => validateRole({ name })).toThrow(
      expect.objectContaining({ code: 'SYSTEM_ROLE_PROTECTED' }),
    );
  });
  it('rejects malformed permission key lists', () => {
    expect(() => normalizePermissionKeys('a:b')).toThrow(
      expect.objectContaining({ code: 'INVALID_ROLE' }),
    );
    expect(() => normalizePermissionKeys(['bad'])).toThrow(
      expect.objectContaining({ code: 'INVALID_PERMISSION' }),
    );
  });
  it('validates role patches', () => {
    expect(validateRolePatch({ description: 'x' })).toEqual({
      description: 'x',
    });
    expect(() => validateRolePatch({})).toThrow(
      expect.objectContaining({ code: 'INVALID_ROLE' }),
    );
    expect(() => validateRolePatch({ name: 'y' } as never)).toThrow(
      expect.objectContaining({ code: 'INVALID_ROLE' }),
    );
  });
  it('protects system roles', () => {
    expect(() => assertMutableRole({ system: true })).toThrow(
      expect.objectContaining({ code: 'SYSTEM_ROLE_PROTECTED' }),
    );
    expect(() => assertMutableRole({ system: false })).not.toThrow();
  });
  it('returns sorted unique effective permissions', () => {
    expect(
      effectivePermissions({ permissionKeys: ['b:x', 'a:x', 'b:x'] }),
    ).toEqual(['a:x', 'b:x']);
  });
});
