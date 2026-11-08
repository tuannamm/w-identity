import {
  CreateUser,
  GetMe,
  UpdateMyProfile,
  SetUserStatus,
  AssignUserRole,
  ListUsers,
} from './identity.use-cases';
import { AuthorizationPolicy } from '../security/authorization.policy';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import type { UserProfileRepositoryPort } from '../ports/user-profile-repository.port';
const admin = { userId: 'admin', issuer: 'issuer', roles: ['admin'] };
const user = { userId: 'alice', issuer: 'issuer', roles: ['user'] };
describe('identity use cases', () => {
  const auth = new AuthorizationPolicy('issuer');
  let identity: IdentityProviderPort, profiles: UserProfileRepositoryPort;
  beforeEach(() => {
    identity = {
      create: jest.fn(async () => ({
        userId: 'new',
        username: 'new',
        enabled: true,
        emailVerified: false,
        roles: [],
      })),
      get: jest.fn(async (id: string) => ({
        userId: id,
        username: id,
        enabled: true,
        emailVerified: false,
        roles: [],
      })),
      list: jest.fn(async () => []),
      update: jest.fn(),
      setEnabled: jest.fn(),
      logout: jest.fn(),
      listRoles: jest.fn(),
      assignRole: jest.fn(),
      removeRole: jest.fn(),
      sendPasswordReset: jest.fn(),
    };
    profiles = { getOrCreate: jest.fn(), update: jest.fn() };
  });
  it('forbids non-admin before side effects', async () => {
    await expect(
      new CreateUser(identity, auth).execute(
        { username: 'x', email: 'x@test.dev' },
        user,
      ),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(identity.create).not.toHaveBeenCalled();
  });
  it('returns created id on default role failure', async () => {
    (identity.assignRole as jest.Mock).mockRejectedValue(new Error());
    await expect(
      new CreateUser(identity, auth).execute(
        { username: 'new', email: 'x@test.dev' },
        admin,
      ),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_CREATED_ROLE_FAILED',
      details: { userId: 'new' },
    });
    expect(identity.create).toHaveBeenCalledTimes(1);
  });
  it('always uses actor id for personal profile', async () => {
    await new UpdateMyProfile(identity, profiles, auth).execute(
      { locale: 'vi' },
      user,
    );
    expect(profiles.update).toHaveBeenCalledWith('alice', { locale: 'vi' });
  });
  it('does not write profile if account is missing', async () => {
    (identity.get as jest.Mock).mockRejectedValue(new Error('missing'));
    await expect(
      new GetMe(identity, profiles, auth).execute({}, user),
    ).rejects.toThrow('missing');
    expect(profiles.getOrCreate).not.toHaveBeenCalled();
  });
  it('rejects wrong issuer and privileged Keycloak role', async () => {
    await expect(
      new GetMe(identity, profiles, auth).execute(
        {},
        { ...user, issuer: 'other' },
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    await expect(
      new AssignUserRole(identity, auth).execute(
        { userId: 'alice', role: 'realm-admin' },
        admin,
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
  it('reports disabled account even if session logout fails', async () => {
    (identity.logout as jest.Mock).mockRejectedValue(new Error());
    await expect(
      new SetUserStatus(identity, auth).execute(
        { userId: 'alice', enabled: false },
        admin,
      ),
    ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED_SESSION_FAILED' });
    expect(identity.setEnabled).toHaveBeenCalledWith('alice', false);
  });
  it('rejects invalid pagination', async () => {
    await expect(
      new ListUsers(identity, auth).execute({ offset: 0, limit: 101 }, admin),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
  });
});
