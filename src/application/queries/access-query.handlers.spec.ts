import { ApplicationError } from '../errors/application-error';
import { AccessResolver } from '../security/access-resolver';
import { AuthorizationPolicy } from '../security/authorization.policy';
import {
  GetMyAccessHandler,
  ResolveUserAccessHandler,
} from './access-query.handlers';
import { GetMyAccessQuery, ResolveUserAccessQuery } from './access.queries';

describe('access queries', () => {
  const role = {
    name: 'user',
    permissionKeys: ['users:read'],
    system: true,
    createdAt: '',
    updatedAt: '',
  };
  const identity = { get: jest.fn() };
  const roles = { findByName: jest.fn() };
  const assignments = { findByUserId: jest.fn() };
  const resolver = new AccessResolver(
    identity as never,
    roles as never,
    assignments as never,
  );
  const mine = new GetMyAccessHandler(
    resolver,
    new AuthorizationPolicy('issuer'),
  );
  const internal = new ResolveUserAccessHandler(resolver);
  beforeEach(() => {
    jest.resetAllMocks();
    identity.get.mockResolvedValue({ userId: 'u1', enabled: true });
    assignments.findByUserId.mockResolvedValue(null);
    roles.findByName.mockResolvedValue(role);
  });
  it('returns the default role and permissions for the authenticated user', async () => {
    await expect(
      mine.execute(new GetMyAccessQuery({ userId: 'u1', issuer: 'issuer' })),
    ).resolves.toEqual({ userId: 'u1', role, permissions: ['users:read'] });
    expect(roles.findByName).toHaveBeenCalledWith('user');
  });
  it('returns no permissions for a disabled account without querying roles', async () => {
    identity.get.mockResolvedValue({ userId: 'u1', enabled: false });
    await expect(
      internal.execute(new ResolveUserAccessQuery('u1')),
    ).resolves.toEqual({ permissions: [] });
    expect(assignments.findByUserId).not.toHaveBeenCalled();
    await expect(
      mine.execute(new GetMyAccessQuery({ userId: 'u1', issuer: 'issuer' })),
    ).rejects.toThrow('Account is disabled');
  });
  it('fails closed when the assigned role is missing', async () => {
    roles.findByName.mockResolvedValue(null);
    await expect(
      internal.execute(new ResolveUserAccessQuery('u1')),
    ).rejects.toThrow('Role not found');
  });
  it('resolves an explicitly assigned role', async () => {
    const editor = { ...role, name: 'editor', permissionKeys: ['users:write'] };
    assignments.findByUserId.mockResolvedValue({
      userId: 'u1',
      roleName: 'editor',
    });
    roles.findByName.mockResolvedValue(editor);
    await expect(
      internal.execute(new ResolveUserAccessQuery('u1')),
    ).resolves.toEqual({ permissions: ['users:write'] });
    expect(roles.findByName).toHaveBeenCalledWith('editor');
  });
  it('treats a deleted user as having no permissions, but propagates other failures', async () => {
    identity.get.mockRejectedValueOnce(
      new ApplicationError('USER_NOT_FOUND', 'User not found'),
    );
    await expect(
      internal.execute(new ResolveUserAccessQuery('u1')),
    ).resolves.toEqual({ permissions: [] });
    identity.get.mockRejectedValueOnce(
      new ApplicationError('DEPENDENCY_UNAVAILABLE', 'Unavailable'),
    );
    await expect(
      internal.execute(new ResolveUserAccessQuery('u1')),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
  });
});
