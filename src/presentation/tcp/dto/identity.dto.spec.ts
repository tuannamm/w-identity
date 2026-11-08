import { actorOf, accountBody, listQuery, profileBody } from './identity.dto';
import { rpcError } from '../filters/identity-error.filter';
import { ApplicationError } from '../../../application/errors/application-error';
describe('TCP boundary', () => {
  it('rejects privileged/unknown fields and malformed values', () => {
    expect(() => profileBody({ userId: 'victim', locale: 'vi' })).toThrow();
    expect(() =>
      accountBody({ username: 'x', email: 'bad', roles: ['admin'] }, true),
    ).toThrow();
    expect(() => profileBody({ avatarUrl: 'javascript:alert(1)' })).toThrow();
    expect(() => profileBody({ timezone: 'Not/AZone' })).toThrow();
    expect(() => listQuery({ limit: ['1', '2'] })).toThrow();
    expect(() => actorOf({ user: { sub: 'a', roles: [] } } as never)).toThrow();
  });
  it('defaults list query and maps safe errors', () => {
    expect(listQuery({})).toEqual({ offset: 0, limit: 20 });
    expect(rpcError(new Error('mongodb://secret'))).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal identity service error',
    });
    expect(
      rpcError(new ApplicationError('FORBIDDEN', 'Denied')).statusCode,
    ).toBe(403);
  });
});
