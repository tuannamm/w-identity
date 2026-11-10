import { AdminSeeder, readAdminSeedSettings } from './admin.seeder';

const config = {
  username: 'admin',
  email: 'admin@example.test',
  password: 'Temp-pass-123',
};
const account = (userId: string) => ({
  userId,
  username: 'admin',
  enabled: true,
  emailVerified: false,
});

function fixtures() {
  const identity = {
    findByUsername: jest.fn(
      async () => null as ReturnType<typeof account> | null,
    ),
    create: jest.fn(async () => account('kc-1')),
    setTemporaryPassword: jest.fn(async () => undefined),
  };
  const roles = { findByName: jest.fn(async () => ({ name: 'admin' })) };
  const userRoles = {
    findByUserId: jest.fn(
      async () => null as { userId: string; roleName: string } | null,
    ),
    set: jest.fn(async (userId: string, roleName: string) => ({
      userId,
      roleName,
    })),
  };
  const seeder = new AdminSeeder(
    identity as never,
    roles as never,
    userRoles as never,
  );
  return { identity, roles, userRoles, seeder };
}

describe('readAdminSeedSettings', () => {
  const env = (values: Record<string, string>) => (key: string) => values[key];
  it('is missing without a username', () => {
    expect(readAdminSeedSettings(env({}))).toEqual({ status: 'missing' });
    expect(readAdminSeedSettings(env({ SEED_ADMIN_USERNAME: '  ' }))).toEqual({
      status: 'missing',
    });
  });
  it('reads a complete configuration', () => {
    expect(
      readAdminSeedSettings(
        env({
          SEED_ADMIN_USERNAME: ' admin ',
          SEED_ADMIN_EMAIL: config.email,
          SEED_ADMIN_PASSWORD: config.password,
        }),
      ),
    ).toEqual({ status: 'enabled', config });
  });
  it.each([
    [{ SEED_ADMIN_USERNAME: 'admin' }],
    [
      {
        SEED_ADMIN_USERNAME: 'admin',
        SEED_ADMIN_EMAIL: 'bad',
        SEED_ADMIN_PASSWORD: 'longenough',
      },
    ],
    [
      {
        SEED_ADMIN_USERNAME: 'admin',
        SEED_ADMIN_EMAIL: config.email,
        SEED_ADMIN_PASSWORD: 'ab',
      },
    ],
  ])('reports an invalid configuration %#', (values) => {
    const result = readAdminSeedSettings(env(values));
    expect(result.status).toBe('invalid');
    expect(JSON.stringify(result)).not.toMatch(/longenough/);
  });
});

describe('AdminSeeder', () => {
  it('creates the account, sets a temporary password and assigns admin', async () => {
    const { identity, userRoles, seeder } = fixtures();
    expect(await seeder.seed(config)).toEqual({
      userId: 'kc-1',
      created: true,
    });
    expect(identity.create).toHaveBeenCalledWith({
      username: 'admin',
      email: config.email,
    });
    expect(identity.setTemporaryPassword).toHaveBeenCalledWith(
      'kc-1',
      config.password,
    );
    expect(userRoles.set).toHaveBeenCalledWith('kc-1', 'admin');
  });
  it('never resets the password of an existing account', async () => {
    const { identity, userRoles, seeder } = fixtures();
    identity.findByUsername.mockResolvedValue(account('kc-9'));
    expect(await seeder.seed(config)).toEqual({
      userId: 'kc-9',
      created: false,
    });
    expect(identity.create).not.toHaveBeenCalled();
    expect(identity.setTemporaryPassword).not.toHaveBeenCalled();
    expect(userRoles.set).toHaveBeenCalledWith('kc-9', 'admin');
  });
  it('does not undo a deliberate demotion', async () => {
    const { identity, userRoles, seeder } = fixtures();
    identity.findByUsername.mockResolvedValue(account('kc-9'));
    userRoles.findByUserId.mockResolvedValue({
      userId: 'kc-9',
      roleName: 'user',
    });
    await seeder.seed(config);
    expect(userRoles.set).not.toHaveBeenCalled();
  });
  it('fails when the admin role was not seeded, before touching Keycloak', async () => {
    const { identity, roles, seeder } = fixtures();
    roles.findByName.mockResolvedValue(null as never);
    await expect(seeder.seed(config)).rejects.toThrow('Admin role is missing');
    expect(identity.findByUsername).not.toHaveBeenCalled();
  });
  it('explains a half-finished creation without leaking the password', async () => {
    const { identity, userRoles, seeder } = fixtures();
    identity.setTemporaryPassword.mockRejectedValue(new Error(config.password));
    const error = await seeder.seed(config).catch((e: Error) => e);
    expect(error).toMatchObject({
      message: expect.stringContaining('password reset'),
    });
    expect((error as Error).message).not.toContain(config.password);
    expect(userRoles.set).not.toHaveBeenCalled();
  });
});
