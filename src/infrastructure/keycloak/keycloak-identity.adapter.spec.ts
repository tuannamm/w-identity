import { KeycloakHttpClient } from '@lib-infrastructure/keycloak';
import { ApplicationError } from '../../application/errors/application-error';
import { KeycloakIdentityAdapter } from './keycloak-identity.adapter';

const options = {
  keycloakUrl: 'http://keycloak',
  realm: 'pm',
  clientId: 'identity',
  clientSecret: 'private-secret',
  timeoutMs: 100,
};
const token = () =>
  Response.json({ access_token: 'private-token', expires_in: 300 });
const account = { username: 'alice', email: 'alice@example.invalid' };

function adapter(
  admin: (url: string, init?: RequestInit) => Promise<Response>,
) {
  return new KeycloakIdentityAdapter(
    new KeycloakHttpClient(options, (async (url: string, init?: RequestInit) =>
      url.endsWith('/token') ? token() : admin(url, init)) as typeof fetch),
  );
}

describe('Keycloak identity adapter boundary', () => {
  it.each([
    [400, 'VALIDATION_ERROR'],
    [401, 'DEPENDENCY_FORBIDDEN'],
    [403, 'DEPENDENCY_FORBIDDEN'],
    [404, 'USER_NOT_FOUND'],
    [409, 'ACCOUNT_CONFLICT'],
    [429, 'DEPENDENCY_UNAVAILABLE'],
    [500, 'DEPENDENCY_UNAVAILABLE'],
  ])('preserves the application contract for HTTP %s', async (status, code) => {
    const identity = adapter(
      async () => new Response('private-upstream', { status: Number(status) }),
    );
    // Cover each client entry point: request, json and command.
    for (const operation of [
      () => identity.create(account),
      () => identity.get('alice'),
      () => identity.setEnabled('alice', false),
    ]) {
      try {
        await operation();
        throw new Error('Expected operation to fail');
      } catch (error) {
        expect(error).toBeInstanceOf(ApplicationError);
        expect(error).toMatchObject({ code });
        expect((error as Error).stack).not.toMatch(
          /private-upstream|private-token|private-secret/,
        );
      }
    }
  });

  it('maps read network errors to unavailable and write network errors to uncertain', async () => {
    const identity = adapter(async () => {
      throw new Error('private-upstream');
    });
    await expect(identity.get('alice')).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
    });
    await expect(identity.create(account)).rejects.toMatchObject({
      code: 'OPERATION_UNCERTAIN',
    });
    await expect(identity.logout('alice')).rejects.toMatchObject({
      code: 'OPERATION_UNCERTAIN',
    });
  });

  it('authentication failures remain unavailable even when their HTTP status is 401', async () => {
    const identity = new KeycloakIdentityAdapter(
      new KeycloakHttpClient(
        options,
        (async () =>
          new Response('private-upstream', { status: 401 })) as typeof fetch,
      ),
    );
    await expect(identity.create(account)).rejects.toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
    });
  });

  it('normalizes malformed JSON and preserves missing-create-identifier uncertainty', async () => {
    await expect(
      adapter(async () => new Response('invalid-json')).get('alice'),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    await expect(
      adapter(async () => new Response(null, { status: 201 })).create(account),
    ).rejects.toMatchObject({ code: 'OPERATION_UNCERTAIN' });
  });

  it('keeps user and email-verification mapping in the worker', async () => {
    const writes: unknown[] = [];
    const identity = adapter(async (url, init) => {
      if (init?.method === 'PUT') {
        writes.push(JSON.parse(init.body as string));
        return new Response(null, { status: 204 });
      }
      return Response.json({
        id: 'alice',
        username: 'alice',
        email: 'old@example.invalid',
        enabled: true,
      });
    });
    await expect(identity.get('alice')).resolves.toMatchObject({
      userId: 'alice',
      emailVerified: false,
    });
    await identity.update('alice', { email: 'new@example.invalid' });
    expect(writes).toEqual([
      { email: 'new@example.invalid', emailVerified: false },
    ]);
  });
  it('finds an exact username match case-insensitively, or null', async () => {
    const urls: string[] = [];
    const identity = adapter(async (url) => {
      urls.push(url);
      return Response.json([
        { id: 'k1', username: 'alice-2', enabled: true },
        { id: 'k2', username: 'alice', enabled: true },
      ]);
    });
    expect(await identity.findByUsername('Alice')).toMatchObject({
      userId: 'k2',
    });
    expect(urls[0]).toContain('/users?username=Alice&exact=true');
    const empty = adapter(async () => Response.json([]));
    expect(await empty.findByUsername('nobody')).toBeNull();
  });

  it('sets a temporary password and keeps it out of errors', async () => {
    const calls: { url: string; init?: RequestInit }[] = [];
    const identity = adapter(async (url, init) => {
      calls.push({ url, init });
      return new Response(null, { status: 204 });
    });
    await identity.setTemporaryPassword('k1', 'secret-pass');
    expect(calls[0].url).toMatch(/\/users\/k1\/reset-password$/);
    expect(calls[0].init?.method).toBe('PUT');
    expect(JSON.parse(String(calls[0].init?.body))).toEqual({
      type: 'password',
      value: 'secret-pass',
      temporary: true,
    });
    const failing = adapter(async () => new Response('x', { status: 500 }));
    const error = await failing
      .setTemporaryPassword('k1', 'secret-pass')
      .catch((e: Error) => e);
    expect((error as Error).stack).not.toMatch(/secret-pass/);
  });
});
