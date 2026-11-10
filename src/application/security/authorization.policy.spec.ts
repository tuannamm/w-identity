import { AuthorizationPolicy } from './authorization.policy';
import type { Actor } from './actor';

describe('AuthorizationPolicy', () => {
  const policy = new AuthorizationPolicy('trusted-issuer');

  it('accepts an actor from the configured issuer', () => {
    expect(() =>
      policy.authenticated({ userId: 'alice', issuer: 'trusted-issuer' }),
    ).not.toThrow();
  });

  it.each<Actor | undefined>([
    undefined,
    { userId: '', issuer: 'trusted-issuer' },
    { userId: 'alice', issuer: 'other-issuer' },
  ])('rejects an unauthenticated actor: %j', (actor) => {
    expect(() => policy.authenticated(actor)).toThrow(
      expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    );
    expect(() => policy.management(actor)).toThrow(
      expect.objectContaining({ code: 'UNAUTHENTICATED' }),
    );
  });

  it('allows management for an authenticated actor (permissions are enforced by the gateway)', () => {
    expect(() =>
      policy.management({ userId: 'admin', issuer: 'trusted-issuer' }),
    ).not.toThrow();
  });
});
