import { KeycloakHttpClient } from './keycloak-http.client';
const config = {
  keycloakUrl: 'http://keycloak',
  realm: 'pm',
  clientId: 'identity',
  clientSecret: 'secret',
  timeoutMs: 100,
};
const token = () =>
  new Response(JSON.stringify({ access_token: 'token', expires_in: 300 }), {
    status: 200,
  });
describe('Keycloak HTTP boundary', () => {
  it('shares a cached token for concurrent requests', async () => {
    const fetcher = jest.fn(async (url: string) =>
      url.endsWith('/token') ? token() : new Response('[]'),
    );
    const http = new KeycloakHttpClient(
      config,
      fetcher as unknown as typeof fetch,
    );
    await Promise.all([http.json('/users'), http.json('/users')]);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith('/token')),
    ).toHaveLength(1);
  });
  it('refreshes once after 401 and never loops', async () => {
    let requests = 0;
    const fetcher = jest.fn(async (url: string) =>
      url.endsWith('/token')
        ? token()
        : new Response(null, { status: ++requests === 1 ? 401 : 204 }),
    );
    await new KeycloakHttpClient(
      config,
      fetcher as unknown as typeof fetch,
    ).command('/users/a', 'PUT', {});
    expect(requests).toBe(2);
    expect(
      fetcher.mock.calls.filter(([url]) => url.endsWith('/token')),
    ).toHaveLength(2);
  });
  it('does not retry a mutation after a network failure', async () => {
    const fetcher = jest.fn(async (url: string) => {
      if (url.endsWith('/token')) return token();
      throw new Error('network');
    });
    await expect(
      new KeycloakHttpClient(
        config,
        fetcher as unknown as typeof fetch,
      ).command('/users', 'POST', {}),
    ).rejects.toMatchObject({ code: 'OPERATION_UNCERTAIN' });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it.each([
    [403, 'DEPENDENCY_FORBIDDEN'],
    [409, 'ACCOUNT_CONFLICT'],
    [404, 'USER_NOT_FOUND'],
    [500, 'DEPENDENCY_UNAVAILABLE'],
  ])('sanitizes HTTP %s', async (status, code) => {
    const fetcher = (async (url: string) =>
      url.endsWith('/token')
        ? token()
        : new Response('secret upstream data', {
            status: Number(status),
          })) as typeof fetch;
    await expect(
      new KeycloakHttpClient(config, fetcher).request('/users'),
    ).rejects.toMatchObject({ code });
  });
});
