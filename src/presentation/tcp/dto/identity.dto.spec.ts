import { actorOf } from './actor.mapper';
import { parseInput } from './parse-input';
import { UpdateMyProfileDto } from './update-my-profile.dto';
import { CreateUserDto } from './create-user.dto';
import { UpdateUserDto } from './update-user.dto';
import { SetUserStatusDto } from './set-user-status.dto';
import { ListUsersQueryDto } from './list-users-query.dto';
import { UserIdParamDto } from './user-id-param.dto';
import { rpcError } from '../filters/identity-error.filter';
import { ApplicationError } from '../../../application/errors/application-error';
import { DatabaseError } from '@lib-infrastructure/database';
import { DomainError } from '../../../domain/errors/domain-error';
describe('TCP boundary', () => {
  it('rejects privileged/unknown fields and malformed values', () => {
    expect(() =>
      parseInput(UpdateMyProfileDto, { userId: 'victim', locale: 'vi' }),
    ).toThrow();
    expect(() =>
      parseInput(CreateUserDto, {
        username: 'x',
        email: 'bad',
        unexpected: true,
      }),
    ).toThrow();
    expect(() =>
      parseInput(UpdateMyProfileDto, { avatarUrl: 'javascript:alert(1)' }),
    ).toThrow();
    expect(() =>
      parseInput(UpdateMyProfileDto, { timezone: 'Not/AZone' }),
    ).toThrow();
    expect(() =>
      parseInput(ListUsersQueryDto, { limit: ['1', '2'] }),
    ).toThrow();
    expect(() => actorOf({ user: { sub: 'a' } } as never)).toThrow();
  });
  it('defaults list query and maps safe errors', () => {
    expect(parseInput(ListUsersQueryDto, {})).toEqual({ offset: 0, limit: 20 });
    expect(rpcError(new Error('mongodb://secret'))).toEqual({
      statusCode: 500,
      code: 'INTERNAL_ERROR',
      message: 'Internal identity service error',
    });
    expect(rpcError(new DatabaseError('Profile storage unavailable'))).toEqual({
      statusCode: 503,
      code: 'DEPENDENCY_UNAVAILABLE',
      message: 'Profile storage unavailable',
    });
    expect(
      rpcError(new ApplicationError('FORBIDDEN', 'Denied')).statusCode,
    ).toBe(403);
    expect(
      rpcError(new DomainError('ACCOUNT_DISABLED', 'Account is disabled')),
    ).toEqual({
      statusCode: 403,
      code: 'FORBIDDEN',
      message: 'Account is disabled',
    });
    expect(
      rpcError(new DomainError('INVALID_PROFILE', 'Invalid timezone')),
    ).toEqual({
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      message: 'Invalid timezone',
    });
  });
});

describe('class DTO validation', () => {
  it('accepts every DTO and preserves input strings', () => {
    expect(
      parseInput(UpdateMyProfileDto, {
        locale: 'vi',
        timezone: 'Asia/Ho_Chi_Minh',
        avatarUrl: 'https://example.com/a',
        phoneNumber: ' x ',
      }),
    ).toMatchObject({ phoneNumber: ' x ' });
    expect(
      parseInput(CreateUserDto, { username: ' x ', email: 'a@b.c' }),
    ).toEqual({ username: ' x ', email: 'a@b.c' });
    expect(parseInput(UpdateUserDto, { firstName: 'A' })).toEqual({
      firstName: 'A',
    });
    expect(parseInput(SetUserStatusDto, { enabled: false })).toEqual({
      enabled: false,
    });
    expect(parseInput(UserIdParamDto, { id: 'abc' })).toEqual({ id: 'abc' });
    expect(
      parseInput(ListUsersQueryDto, {
        offset: '2',
        limit: '100',
        enabled: 'false',
        search: 'a',
      }),
    ).toEqual({ offset: 2, limit: 100, enabled: false, search: 'a' });
  });
  const cases: [new () => object, unknown][] = [
    [CreateUserDto, { email: 'a@b.c' }],
    [CreateUserDto, { username: 'a' }],
    [CreateUserDto, { username: 'a', email: 'invalid-secret' }],
    [CreateUserDto, { username: 'a'.repeat(256), email: 'a@b.c' }],
    [UpdateUserDto, {}],
    [UpdateMyProfileDto, {}],
    [UpdateUserDto, { firstName: '   ' }],
    [UpdateUserDto, { firstName: null }],
    [UpdateUserDto, { firstName: undefined }],
    [UpdateMyProfileDto, { avatarUrl: 'https://user:pass@example.com' }],
    [UpdateMyProfileDto, { locale: 'invalid_locale' }],
    [UpdateMyProfileDto, { phoneNumber: 'a'.repeat(101) }],
    [
      UpdateMyProfileDto,
      { avatarUrl: 'https://example.com/' + 'a'.repeat(2048) },
    ],
    [
      UpdateMyProfileDto,
      JSON.parse('{"__proto__":{"userId":"victim"},"locale":"vi"}'),
    ],
    [UpdateMyProfileDto, { _atLeastOneField: true }],
    [SetUserStatusDto, { enabled: 'yes' }],
    [SetUserStatusDto, { enabled: true, unexpected: true }],
    [UserIdParamDto, { id: '' }],
    [UserIdParamDto, { id: 'a'.repeat(129) }],
    [ListUsersQueryDto, { offset: '-1' }],
    [ListUsersQueryDto, { limit: '0' }],
    [ListUsersQueryDto, { limit: '101' }],
    [ListUsersQueryDto, { enabled: 'yes' }],
    [ListUsersQueryDto, { limit: 20 }],
    [ListUsersQueryDto, []],
    [UpdateMyProfileDto, null],
    [UpdateMyProfileDto, 'secret'],
  ];
  it.each(cases)('rejects invalid input for %p', (dto, input) => {
    try {
      parseInput(dto, input);
      throw new Error('Expected rejection');
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect(rpcError(error)).toMatchObject({
        statusCode: 400,
        code: 'VALIDATION_ERROR',
      });
      expect((error as Error).message).not.toContain('secret');
      expect((error as Error).message).not.toContain('victim');
    }
  });
});
