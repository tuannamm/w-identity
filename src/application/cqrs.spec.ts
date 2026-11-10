import * as Commands from './commands/identity.commands';
import * as CommandHandlers from './commands/identity-command.handlers';
import * as Queries from './queries/identity.queries';
import * as QueryHandlers from './queries/identity-query.handlers';
import { AuthorizationPolicy } from './security/authorization.policy';
import { ApplicationError } from './errors/application-error';
import type { IdentityProviderPort } from './ports/identity-provider.port';
import type { UserRepositoryPort } from './ports/user-repository.port';
import type { User } from '../domain/models/user';

const actor = { userId: 'alice', issuer: 'issuer' };
const profile: User = {
  userId: 'alice',
  locale: 'vi',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
};
let identity: jest.Mocked<IdentityProviderPort>;
let profiles: jest.Mocked<UserRepositoryPort>;
let auth: AuthorizationPolicy;
beforeEach(() => {
  auth = new AuthorizationPolicy('issuer');
  identity = {
    create: jest.fn(),
    get: jest.fn(async (userId) => ({
      userId,
      username: userId,
      enabled: true,
      emailVerified: false,
    })),
    list: jest
      .fn<
        ReturnType<IdentityProviderPort['list']>,
        Parameters<IdentityProviderPort['list']>
      >()
      .mockResolvedValue([]),
    update: jest.fn(),
    setEnabled: jest.fn(),
    logout: jest.fn(),
    sendPasswordReset: jest.fn(),
    findByUsername: jest.fn(),
    setTemporaryPassword: jest.fn(),
  };
  profiles = {
    findByUserId: jest
      .fn<
        ReturnType<UserRepositoryPort['findByUserId']>,
        Parameters<UserRepositoryPort['findByUserId']>
      >()
      .mockResolvedValue(profile),
    update: jest
      .fn<
        ReturnType<UserRepositoryPort['update']>,
        Parameters<UserRepositoryPort['update']>
      >()
      .mockResolvedValue(profile),
  };
});

describe('queries', () => {
  it('reads the current profile without calling the write method', async () => {
    const reader: UserRepositoryPort = profiles;
    const result = await new QueryHandlers.GetMeHandler(
      identity,
      reader,
      auth,
    ).execute(new Queries.GetMeQuery(actor));
    expect(identity.get).toHaveBeenCalledWith('alice');
    expect(profiles.findByUserId).toHaveBeenCalledWith('alice');
    expect(result.profile).toEqual(profile);
    expect(profiles.update).not.toHaveBeenCalled();
  });
  it('returns null for an absent profile without creating one', async () => {
    profiles.findByUserId.mockResolvedValue(null);
    const result = await new QueryHandlers.GetMeHandler(
      identity,
      profiles,
      auth,
    ).execute(new Queries.GetMeQuery(actor));
    expect(result.profile).toBeNull();
    expect(profiles.update).not.toHaveBeenCalled();
  });
  it('GetUser also reads a missing profile without writing', async () => {
    jest.spyOn(auth, 'management').mockImplementation(() => undefined);
    profiles.findByUserId.mockResolvedValue(null);
    const result = await new QueryHandlers.GetUserHandler(
      identity,
      profiles,
      auth,
    ).execute(new Queries.GetUserQuery({ userId: 'bob' }, actor));
    expect(profiles.findByUserId).toHaveBeenCalledWith('bob');
    expect(result.profile).toBeNull();
    expect(profiles.update).not.toHaveBeenCalled();
  });
  it('rejects a disabled account before accessing storage', async () => {
    identity.get.mockResolvedValue({
      userId: 'alice',
      username: 'alice',
      enabled: false,
      emailVerified: false,
    });
    await expect(
      new QueryHandlers.GetMeHandler(identity, profiles, auth).execute(
        new Queries.GetMeQuery(actor),
      ),
    ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' });
    expect(profiles.findByUserId).not.toHaveBeenCalled();
  });
  it('rejects an invalid issuer before dependencies', async () => {
    await expect(
      new QueryHandlers.GetMeHandler(identity, profiles, auth).execute(
        new Queries.GetMeQuery({ ...actor, issuer: 'other' }),
      ),
    ).rejects.toMatchObject({ code: 'UNAUTHENTICATED' });
    expect(identity.get).not.toHaveBeenCalled();
    expect(profiles.findByUserId).not.toHaveBeenCalled();
  });
  it('propagates a missing account without reading profile storage', async () => {
    identity.get.mockRejectedValue(new Error('missing'));
    await expect(
      new QueryHandlers.GetMeHandler(identity, profiles, auth).execute(
        new Queries.GetMeQuery(actor),
      ),
    ).rejects.toThrow('missing');
    expect(profiles.findByUserId).not.toHaveBeenCalled();
  });
  it('validates pagination before calling the identity provider', async () => {
    jest.spyOn(auth, 'management').mockImplementation(() => undefined);
    await expect(
      new QueryHandlers.ListUsersHandler(identity, auth).execute(
        new Queries.ListUsersQuery({ offset: 0, limit: 101 }, actor),
      ),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR' });
    expect(identity.list).not.toHaveBeenCalled();
  });
});

describe('commands', () => {
  it('updates the actor profile and returns the persisted result', async () => {
    const result = await new CommandHandlers.UpdateMyProfileHandler(
      identity,
      profiles,
      auth,
    ).execute(new Commands.UpdateMyProfileCommand({ locale: 'vi' }, actor));
    expect(profiles.update).toHaveBeenCalledWith('alice', { locale: 'vi' });
    expect(profiles.findByUserId).not.toHaveBeenCalled();
    expect(result).toEqual(profile);
  });
  it.each([
    {},
    { timezone: 'Not/AZone' },
    { locale: 'not_a_locale' },
    { avatarUrl: 'javascript:alert(1)' },
    { phoneNumber: ' ' },
  ])('validates direct command calls before writing %#', async (input) => {
    await expect(
      new CommandHandlers.UpdateMyProfileHandler(
        identity,
        profiles,
        auth,
      ).execute(new Commands.UpdateMyProfileCommand(input, actor)),
    ).rejects.toMatchObject({ code: 'INVALID_PROFILE' });
    expect(profiles.update).not.toHaveBeenCalled();
  });
  it('rejects disabled accounts before writing', async () => {
    identity.get.mockResolvedValue({
      userId: 'alice',
      username: 'alice',
      enabled: false,
      emailVerified: false,
    });
    await expect(
      new CommandHandlers.UpdateMyProfileHandler(
        identity,
        profiles,
        auth,
      ).execute(new Commands.UpdateMyProfileCommand({ locale: 'vi' }, actor)),
    ).rejects.toMatchObject({ code: 'ACCOUNT_DISABLED' });
    expect(profiles.update).not.toHaveBeenCalled();
  });
  it('preserves storage errors', async () => {
    const error = new ApplicationError(
      'DEPENDENCY_UNAVAILABLE',
      'Profile storage unavailable',
    );
    profiles.update.mockRejectedValue(error);
    await expect(
      new CommandHandlers.UpdateMyProfileHandler(
        identity,
        profiles,
        auth,
      ).execute(new Commands.UpdateMyProfileCommand({ locale: 'vi' }, actor)),
    ).rejects.toBe(error);
  });
  const stranger = { userId: 'alice', issuer: 'untrusted-issuer' };
  it('rejects account management from an unauthenticated actor', async () => {
    const operations = [
      () =>
        new CommandHandlers.CreateUserHandler(identity, auth, '123').execute(
          new Commands.CreateUserCommand(
            { username: 'x', email: 'x@test.dev' },
            stranger,
          ),
        ),
      () =>
        new CommandHandlers.UpdateUserHandler(identity, auth).execute(
          new Commands.UpdateUserCommand(
            { userId: 'alice', patch: {} },
            stranger,
          ),
        ),
      () =>
        new CommandHandlers.SetUserStatusHandler(identity, auth).execute(
          new Commands.SetUserStatusCommand(
            { userId: 'alice', enabled: false },
            stranger,
          ),
        ),
      () =>
        new CommandHandlers.SendPasswordResetEmailHandler(
          identity,
          auth,
        ).execute(
          new Commands.SendPasswordResetEmailCommand(
            { userId: 'alice' },
            stranger,
          ),
        ),
      () =>
        new QueryHandlers.GetUserHandler(identity, profiles, auth).execute(
          new Queries.GetUserQuery({ userId: 'alice' }, stranger),
        ),
      () =>
        new QueryHandlers.ListUsersHandler(identity, auth).execute(
          new Queries.ListUsersQuery({ offset: 0, limit: 10 }, stranger),
        ),
    ];
    for (const operation of operations)
      await expect(operation()).rejects.toMatchObject({
        code: 'UNAUTHENTICATED',
      });
    expect(identity.create).not.toHaveBeenCalled();
    expect(identity.get).not.toHaveBeenCalled();
    expect(identity.setEnabled).not.toHaveBeenCalled();
    expect(profiles.update).not.toHaveBeenCalled();
  });
  it('reports a partial failure after disabling an account', async () => {
    jest.spyOn(auth, 'management').mockImplementation(() => undefined);
    identity.logout.mockRejectedValue(new Error('offline'));
    await expect(
      new CommandHandlers.SetUserStatusHandler(identity, auth).execute(
        new Commands.SetUserStatusCommand(
          { userId: 'alice', enabled: false },
          actor,
        ),
      ),
    ).rejects.toMatchObject({
      code: 'ACCOUNT_DISABLED_SESSION_FAILED',
      details: { userId: 'alice' },
    });
    expect(identity.setEnabled).toHaveBeenCalledWith('alice', false);
  });
});

describe('CreateUser default password', () => {
  const input = { username: 'bob', email: 'bob@test.dev' };
  const created = {
    userId: 'kc-bob',
    username: 'bob',
    enabled: true,
    emailVerified: false,
  };
  beforeEach(() => {
    jest.spyOn(auth, 'management').mockImplementation(() => undefined);
    identity.create.mockResolvedValue(created);
  });
  it('sets the default password after creating the account', async () => {
    const result = await new CommandHandlers.CreateUserHandler(
      identity,
      auth,
      '123',
    ).execute(new Commands.CreateUserCommand(input, actor));
    expect(result).toBe(created);
    expect(identity.setTemporaryPassword).toHaveBeenCalledWith('kc-bob', '123');
    expect(identity.create.mock.invocationCallOrder[0]).toBeLessThan(
      identity.setTemporaryPassword.mock.invocationCallOrder[0],
    );
  });
  it('reports which account is left without a password, without leaking it', async () => {
    identity.setTemporaryPassword.mockRejectedValue(new Error('123 rejected'));
    const error = await new CommandHandlers.CreateUserHandler(
      identity,
      auth,
      '123',
    )
      .execute(new Commands.CreateUserCommand(input, actor))
      .catch((e: ApplicationError) => e);
    expect(error).toMatchObject({
      code: 'ACCOUNT_CREATED_PASSWORD_FAILED',
      details: { userId: 'kc-bob' },
    });
    expect(JSON.stringify(error)).not.toContain('123');
    expect((error as Error).message).not.toContain('123');
  });
  it('does not set a password when the account was not created', async () => {
    identity.create.mockRejectedValue(
      new ApplicationError('ACCOUNT_CONFLICT', 'exists'),
    );
    await expect(
      new CommandHandlers.CreateUserHandler(identity, auth, '123').execute(
        new Commands.CreateUserCommand(input, actor),
      ),
    ).rejects.toMatchObject({ code: 'ACCOUNT_CONFLICT' });
    expect(identity.setTemporaryPassword).not.toHaveBeenCalled();
  });
});
