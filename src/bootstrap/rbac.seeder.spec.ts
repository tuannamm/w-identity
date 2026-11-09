import { DEFAULT_PERMISSIONS, RbacSeeder } from './rbac.seeder';

it('seeds default permissions plus immutable admin and user roles', async () => {
  const permissions = { ensure: jest.fn() };
  const roles = { ensureSystemRole: jest.fn() };
  await new RbacSeeder(
    permissions as never,
    roles as never,
  ).onApplicationBootstrap();
  expect(permissions.ensure).toHaveBeenCalledTimes(DEFAULT_PERMISSIONS.length);
  expect(roles.ensureSystemRole).toHaveBeenCalledWith(
    expect.objectContaining({
      name: 'admin',
      permissionKeys: DEFAULT_PERMISSIONS.map((p) => p.key),
    }),
  );
  expect(roles.ensureSystemRole).toHaveBeenCalledWith(
    expect.objectContaining({ name: 'user', permissionKeys: [] }),
  );
});
