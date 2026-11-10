import { Test } from '@nestjs/testing';
import {
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from './tokens';
import { DEFAULT_PERMISSIONS, RbacSeeder } from './rbac.seeder';

it('seeds default permissions plus immutable admin and user roles', async () => {
  const permissions = { ensure: jest.fn() };
  const roles = { ensureSystemRole: jest.fn() };
  const userRoles = { set: jest.fn() };
  await new RbacSeeder(
    permissions as never,
    roles as never,
    userRoles as never,
    undefined,
  ).seed();
  expect(userRoles.set).not.toHaveBeenCalled();
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

it('promotes BOOTSTRAP_ADMIN_USER_ID to admin when configured', async () => {
  const userRoles = { set: jest.fn() };
  await new RbacSeeder(
    { ensure: jest.fn() } as never,
    { ensureSystemRole: jest.fn() } as never,
    userRoles as never,
    ' kc-user-1 ',
  ).seed();
  expect(userRoles.set).toHaveBeenCalledWith('kc-user-1', 'admin');
});

it('is resolvable by Nest DI (the env-based admin id is optional, not a provider)', async () => {
  const userRoles = { set: jest.fn() };
  const module = await Test.createTestingModule({
    providers: [
      RbacSeeder,
      { provide: PERMISSION_REPOSITORY, useValue: { ensure: jest.fn() } },
      { provide: ROLE_REPOSITORY, useValue: { ensureSystemRole: jest.fn() } },
      { provide: USER_ROLE_REPOSITORY, useValue: userRoles },
    ],
  }).compile();
  const seeder = module.get(RbacSeeder);
  await seeder.seed();
  expect(userRoles.set).not.toHaveBeenCalled();
});
