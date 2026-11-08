import { loadIdentityConfig } from './identity.config';
const env = {
  MONGODB_URI: 'mongodb://localhost/identity',
  KEYCLOAK_URL: 'http://localhost:8081',
  KEYCLOAK_REALM: 'pm',
  KEYCLOAK_CLIENT_ID: 'identity-service',
  KEYCLOAK_CLIENT_SECRET: 'test',
  KEYCLOAK_ISSUER: 'http://localhost:8081/realms/pm',
};
describe('identity configuration', () => {
  it('uses safe local defaults', () =>
    expect(loadIdentityConfig(env)).toMatchObject({
      host: '127.0.0.1',
      port: 4002,
    }));
  it.each(['KEYCLOAK_CLIENT_SECRET', 'MONGODB_URI', 'KEYCLOAK_ISSUER'])(
    'rejects missing %s',
    (key) =>
      expect(() => loadIdentityConfig({ ...env, [key]: '' })).toThrow(key),
  );
  it('rejects invalid port and URL without leaking secrets', () => {
    expect(() => loadIdentityConfig({ ...env, PORT: '0' })).toThrow('PORT');
    expect(() =>
      loadIdentityConfig({ ...env, KEYCLOAK_URL: 'http://admin:secret@host' }),
    ).toThrow('KEYCLOAK_URL');
  });
});
