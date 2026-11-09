import * as PC from './commands/permission.commands';
import * as PCH from './commands/permission-command.handlers';
import * as RC from './commands/role.commands';
import * as RCH from './commands/role-command.handlers';
import * as PQ from './queries/permission.queries';
import * as PQH from './queries/permission-query.handlers';
import * as RQ from './queries/role.queries';
import * as RQH from './queries/role-query.handlers';
import { AuthorizationPolicy } from './security/authorization.policy';
import type { IdentityProviderPort } from './ports/identity-provider.port';
import type { PermissionRepositoryPort } from './ports/permission-repository.port';
import type { RoleRepositoryPort } from './ports/role-repository.port';
import type { UserRoleRepositoryPort } from './ports/user-role-repository.port';
import type { Role } from '../domain/models/role';
import type { Permission } from '../domain/models/permission';

const actor = { userId: 'admin', issuer: 'issuer' };
const now = '2026-01-01T00:00:00.000Z';
const role = (over: Partial<Role> = {}): Role => ({
  name: 'editor',
  permissionKeys: ['users:read'],
  system: false,
  createdAt: now,
  updatedAt: now,
  ...over,
});
const permission: Permission = {
  key: 'users:read',
  createdAt: now,
  updatedAt: now,
};

let auth: AuthorizationPolicy;
let identity: jest.Mocked<IdentityProviderPort>;
let permissions: jest.Mocked<PermissionRepositoryPort>;
let roles: jest.Mocked<RoleRepositoryPort>;
let userRoles: jest.Mocked<UserRoleRepositoryPort>;

beforeEach(() => {
  auth = new AuthorizationPolicy('issuer');
  identity = {
    create: jest.fn(),
    get: jest.fn(async (userId: string) => ({
      userId,
      username: userId,
      enabled: true,
      emailVerified: false,
    })),
    list: jest.fn(),
    update: jest.fn(),
    setEnabled: jest.fn(),
    logout: jest.fn(),
    sendPasswordReset: jest.fn(),
  } as unknown as jest.Mocked<IdentityProviderPort>;
  permissions = {
    insert: jest.fn(async (input) => ({ ...permission, ...input })),
    findByKey: jest.fn(async () => permission),
    findByKeys: jest.fn(async () => [permission]),
    list: jest.fn(async () => [permission]),
    delete: jest.fn(async () => true),
  } as unknown as jest.Mocked<PermissionRepositoryPort>;
  roles = {
    insert: jest.fn(async (input) => role(input)),
    findByName: jest.fn(async () => role()),
    list: jest.fn(async () => [role()]),
    updateDescription: jest.fn(async (_, patch) => role(patch)),
    delete: jest.fn(async () => true),
    addPermission: jest.fn(async () => role()),
    removePermission: jest.fn(async () => role({ permissionKeys: [] })),
    countByPermission: jest.fn(async () => 0),
  } as unknown as jest.Mocked<RoleRepositoryPort>;
  userRoles = {
    findByUserId: jest.fn(async () => null),
    set: jest.fn(async (userId, roleName) => ({ userId, roleName })),
    countByRole: jest.fn(async () => 0),
  } as unknown as jest.Mocked<UserRoleRepositoryPort>;
});
const allowManagement = () =>
  jest.spyOn(auth, 'management').mockImplementation(() => undefined);

describe('management gate', () => {
  it('keeps every RBAC operation FORBIDDEN while management is disabled', async () => {
    const operations = [
      () =>
        new PCH.CreatePermissionHandler(permissions, auth).execute(
          new PC.CreatePermissionCommand({ key: 'a:b' }, actor),
        ),
      () =>
        new PCH.DeletePermissionHandler(permissions, roles, auth).execute(
          new PC.DeletePermissionCommand({ key: 'a:b' }, actor),
        ),
      () =>
        new RCH.CreateRoleHandler(roles, permissions, auth).execute(
          new RC.CreateRoleCommand({ name: 'editor' }, actor),
        ),
      () =>
        new RCH.UpdateRoleHandler(roles, auth).execute(
          new RC.UpdateRoleCommand(
            { name: 'editor', patch: { description: 'x' } },
            actor,
          ),
        ),
      () =>
        new RCH.DeleteRoleHandler(roles, userRoles, auth).execute(
          new RC.DeleteRoleCommand({ name: 'editor' }, actor),
        ),
      () =>
        new RCH.GrantPermissionToRoleHandler(roles, permissions, auth).execute(
          new RC.GrantPermissionToRoleCommand(
            { name: 'editor', permissionKey: 'a:b' },
            actor,
          ),
        ),
      () =>
        new RCH.RevokePermissionFromRoleHandler(roles, auth).execute(
          new RC.RevokePermissionFromRoleCommand(
            { name: 'editor', permissionKey: 'a:b' },
            actor,
          ),
        ),
      () =>
        new RCH.AssignRoleToUserHandler(
          identity,
          roles,
          userRoles,
          auth,
        ).execute(
          new RC.AssignRoleToUserCommand(
            { userId: 'u', roleName: 'editor' },
            actor,
          ),
        ),
      () =>
        new PQH.ListPermissionsHandler(permissions, auth).execute(
          new PQ.ListPermissionsQuery(actor),
        ),
      () =>
        new PQH.GetPermissionHandler(permissions, auth).execute(
          new PQ.GetPermissionQuery({ key: 'a:b' }, actor),
        ),
      () =>
        new RQH.ListRolesHandler(roles, auth).execute(
          new RQ.ListRolesQuery(actor),
        ),
      () =>
        new RQH.GetRoleHandler(roles, auth).execute(
          new RQ.GetRoleQuery({ name: 'editor' }, actor),
        ),
      () =>
        new RQH.GetUserRoleHandler(identity, roles, userRoles, auth).execute(
          new RQ.GetUserRoleQuery({ userId: 'u' }, actor),
        ),
      () =>
        new RQH.GetUserPermissionsHandler(
          identity,
          roles,
          userRoles,
          auth,
        ).execute(new RQ.GetUserPermissionsQuery({ userId: 'u' }, actor)),
    ];
    for (const operation of operations)
      await expect(operation()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(permissions.insert).not.toHaveBeenCalled();
    expect(roles.insert).not.toHaveBeenCalled();
    expect(userRoles.set).not.toHaveBeenCalled();
  });
});

describe('permission commands', () => {
  beforeEach(allowManagement);
  it('creates a validated permission', async () => {
    const result = await new PCH.CreatePermissionHandler(
      permissions,
      auth,
    ).execute(new PC.CreatePermissionCommand({ key: 'roles:write' }, actor));
    expect(permissions.insert).toHaveBeenCalledWith({ key: 'roles:write' });
    expect(result.key).toBe('roles:write');
  });
  it('rejects a malformed key before storage', async () => {
    await expect(
      new PCH.CreatePermissionHandler(permissions, auth).execute(
        new PC.CreatePermissionCommand({ key: 'bad' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'INVALID_PERMISSION' });
    expect(permissions.insert).not.toHaveBeenCalled();
  });
  it('refuses to delete a permission granted to a role', async () => {
    roles.countByPermission.mockResolvedValue(2);
    await expect(
      new PCH.DeletePermissionHandler(permissions, roles, auth).execute(
        new PC.DeletePermissionCommand({ key: 'users:read' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_IN_USE' });
    expect(permissions.delete).not.toHaveBeenCalled();
  });
  it('404s when deleting an unknown permission', async () => {
    permissions.findByKey.mockResolvedValue(null);
    await expect(
      new PCH.DeletePermissionHandler(permissions, roles, auth).execute(
        new PC.DeletePermissionCommand({ key: 'users:read' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_NOT_FOUND' });
  });
  it('deletes an unused permission', async () => {
    await new PCH.DeletePermissionHandler(permissions, roles, auth).execute(
      new PC.DeletePermissionCommand({ key: 'users:read' }, actor),
    );
    expect(permissions.delete).toHaveBeenCalledWith('users:read');
  });
});

describe('role commands', () => {
  beforeEach(allowManagement);
  it('creates a role whose permissions all exist', async () => {
    await new RCH.CreateRoleHandler(roles, permissions, auth).execute(
      new RC.CreateRoleCommand(
        { name: 'editor', permissionKeys: ['users:read', 'users:read'] },
        actor,
      ),
    );
    expect(roles.insert).toHaveBeenCalledWith({
      name: 'editor',
      permissionKeys: ['users:read'],
    });
  });
  it('rejects unknown permissions and reports which', async () => {
    permissions.findByKeys.mockResolvedValue([]);
    await expect(
      new RCH.CreateRoleHandler(roles, permissions, auth).execute(
        new RC.CreateRoleCommand(
          { name: 'editor', permissionKeys: ['x:y'] },
          actor,
        ),
      ),
    ).rejects.toMatchObject({
      code: 'PERMISSION_NOT_FOUND',
      details: { permissionKeys: ['x:y'] },
    });
    expect(roles.insert).not.toHaveBeenCalled();
  });
  it('rejects reserved system names', async () => {
    await expect(
      new RCH.CreateRoleHandler(roles, permissions, auth).execute(
        new RC.CreateRoleCommand({ name: 'admin' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'SYSTEM_ROLE_PROTECTED' });
  });
  it.each([
    [
      'update',
      () =>
        new RCH.UpdateRoleHandler(roles, auth).execute(
          new RC.UpdateRoleCommand(
            { name: 'admin', patch: { description: 'x' } },
            actor,
          ),
        ),
    ],
    [
      'delete',
      () =>
        new RCH.DeleteRoleHandler(roles, userRoles, auth).execute(
          new RC.DeleteRoleCommand({ name: 'admin' }, actor),
        ),
    ],
    [
      'grant',
      () =>
        new RCH.GrantPermissionToRoleHandler(roles, permissions, auth).execute(
          new RC.GrantPermissionToRoleCommand(
            { name: 'admin', permissionKey: 'a:b' },
            actor,
          ),
        ),
    ],
    [
      'revoke',
      () =>
        new RCH.RevokePermissionFromRoleHandler(roles, auth).execute(
          new RC.RevokePermissionFromRoleCommand(
            { name: 'admin', permissionKey: 'a:b' },
            actor,
          ),
        ),
    ],
  ])('protects system roles on %s', async (_, run) => {
    roles.findByName.mockResolvedValue(role({ name: 'admin', system: true }));
    await expect(run()).rejects.toMatchObject({
      code: 'SYSTEM_ROLE_PROTECTED',
    });
    expect(roles.updateDescription).not.toHaveBeenCalled();
    expect(roles.delete).not.toHaveBeenCalled();
    expect(roles.addPermission).not.toHaveBeenCalled();
    expect(roles.removePermission).not.toHaveBeenCalled();
  });
  it('404s for a missing role', async () => {
    roles.findByName.mockResolvedValue(null);
    await expect(
      new RCH.DeleteRoleHandler(roles, userRoles, auth).execute(
        new RC.DeleteRoleCommand({ name: 'ghost' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND' });
  });
  it('refuses to delete a role assigned to users', async () => {
    userRoles.countByRole.mockResolvedValue(1);
    await expect(
      new RCH.DeleteRoleHandler(roles, userRoles, auth).execute(
        new RC.DeleteRoleCommand({ name: 'editor' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'ROLE_IN_USE' });
    expect(roles.delete).not.toHaveBeenCalled();
  });
  it('grants an existing permission and fails for an unknown one', async () => {
    await new RCH.GrantPermissionToRoleHandler(
      roles,
      permissions,
      auth,
    ).execute(
      new RC.GrantPermissionToRoleCommand(
        { name: 'editor', permissionKey: 'users:read' },
        actor,
      ),
    );
    expect(roles.addPermission).toHaveBeenCalledWith('editor', 'users:read');
    permissions.findByKey.mockResolvedValue(null);
    await expect(
      new RCH.GrantPermissionToRoleHandler(roles, permissions, auth).execute(
        new RC.GrantPermissionToRoleCommand(
          { name: 'editor', permissionKey: 'users:read' },
          actor,
        ),
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_NOT_FOUND' });
  });
  it('revokes a permission', async () => {
    await new RCH.RevokePermissionFromRoleHandler(roles, auth).execute(
      new RC.RevokePermissionFromRoleCommand(
        { name: 'editor', permissionKey: 'users:read' },
        actor,
      ),
    );
    expect(roles.removePermission).toHaveBeenCalledWith('editor', 'users:read');
  });
  it('assigns a role by replacing the previous one', async () => {
    const result = await new RCH.AssignRoleToUserHandler(
      identity,
      roles,
      userRoles,
      auth,
    ).execute(
      new RC.AssignRoleToUserCommand(
        { userId: 'bob', roleName: 'editor' },
        actor,
      ),
    );
    expect(identity.get).toHaveBeenCalledWith('bob');
    expect(userRoles.set).toHaveBeenCalledWith('bob', 'editor');
    expect(result).toEqual({ userId: 'bob', roleName: 'editor' });
  });
  it('does not assign when the role or user is unknown', async () => {
    roles.findByName.mockResolvedValue(null);
    await expect(
      new RCH.AssignRoleToUserHandler(identity, roles, userRoles, auth).execute(
        new RC.AssignRoleToUserCommand(
          { userId: 'bob', roleName: 'ghost' },
          actor,
        ),
      ),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND' });
    roles.findByName.mockResolvedValue(role());
    identity.get.mockRejectedValue(new Error('USER_NOT_FOUND'));
    await expect(
      new RCH.AssignRoleToUserHandler(identity, roles, userRoles, auth).execute(
        new RC.AssignRoleToUserCommand(
          { userId: 'nobody', roleName: 'editor' },
          actor,
        ),
      ),
    ).rejects.toThrow('USER_NOT_FOUND');
    expect(userRoles.set).not.toHaveBeenCalled();
  });
});

describe('queries', () => {
  beforeEach(allowManagement);
  it('lists and gets permissions and roles', async () => {
    expect(
      await new PQH.ListPermissionsHandler(permissions, auth).execute(
        new PQ.ListPermissionsQuery(actor),
      ),
    ).toEqual({ items: [permission] });
    expect(
      await new RQH.ListRolesHandler(roles, auth).execute(
        new RQ.ListRolesQuery(actor),
      ),
    ).toEqual({ items: [role()] });
    expect(
      await new RQH.GetRoleHandler(roles, auth).execute(
        new RQ.GetRoleQuery({ name: 'editor' }, actor),
      ),
    ).toEqual(role());
    permissions.findByKey.mockResolvedValue(null);
    await expect(
      new PQH.GetPermissionHandler(permissions, auth).execute(
        new PQ.GetPermissionQuery({ key: 'a:b' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'PERMISSION_NOT_FOUND' });
  });
  it('defaults a user without an assignment to the "user" role', async () => {
    roles.findByName.mockResolvedValue(role({ name: 'user', system: true }));
    const result = await new RQH.GetUserRoleHandler(
      identity,
      roles,
      userRoles,
      auth,
    ).execute(new RQ.GetUserRoleQuery({ userId: 'bob' }, actor));
    expect(roles.findByName).toHaveBeenCalledWith('user');
    expect(result.role.name).toBe('user');
  });
  it('returns the permissions of the assigned role only', async () => {
    userRoles.findByUserId.mockResolvedValue({
      userId: 'bob',
      roleName: 'editor',
    });
    roles.findByName.mockResolvedValue(
      role({ permissionKeys: ['b:x', 'a:x'] }),
    );
    const result = await new RQH.GetUserPermissionsHandler(
      identity,
      roles,
      userRoles,
      auth,
    ).execute(new RQ.GetUserPermissionsQuery({ userId: 'bob' }, actor));
    expect(roles.findByName).toHaveBeenCalledWith('editor');
    expect(result).toEqual({
      userId: 'bob',
      roleName: 'editor',
      permissions: ['a:x', 'b:x'],
    });
  });
  it('fails clearly when the default role was never seeded', async () => {
    roles.findByName.mockResolvedValue(null);
    await expect(
      new RQH.GetUserRoleHandler(identity, roles, userRoles, auth).execute(
        new RQ.GetUserRoleQuery({ userId: 'bob' }, actor),
      ),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND' });
  });
});
