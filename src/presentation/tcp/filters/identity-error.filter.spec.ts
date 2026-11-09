import { Logger, type ArgumentsHost } from '@nestjs/common';
import { firstValueFrom } from 'rxjs';
import {
  ApplicationError,
  type ErrorCode,
} from '../../../application/errors/application-error';
import { DomainError } from '../../../domain/errors/domain-error';
import { IdentityErrorFilter, rpcError } from './identity-error.filter';

describe('identity RPC errors', () => {
  afterEach(() => jest.restoreAllMocks());

  it.each<[ErrorCode, number]>([
    ['UNAUTHENTICATED', 401],
    ['FORBIDDEN', 403],
    ['VALIDATION_ERROR', 400],
    ['USER_NOT_FOUND', 404],
    ['ACCOUNT_CONFLICT', 409],
    ['DEPENDENCY_UNAVAILABLE', 503],
    ['DEPENDENCY_FORBIDDEN', 503],
    ['OPERATION_UNCERTAIN', 502],
    ['ACCOUNT_DISABLED_SESSION_FAILED', 502],
    ['ROLE_NOT_FOUND', 404],
    ['PERMISSION_NOT_FOUND', 404],
    ['ROLE_CONFLICT', 409],
    ['PERMISSION_CONFLICT', 409],
    ['ROLE_IN_USE', 409],
    ['PERMISSION_IN_USE', 409],
  ])('maps %s to HTTP %s', (code, statusCode) => {
    expect(
      rpcError(new ApplicationError(code, 'Safe message', { field: 'email' })),
    ).toEqual({
      statusCode,
      code,
      message: 'Safe message',
      details: { field: 'email' },
    });
  });

  it.each([
    ['ACCOUNT_DISABLED', 403, 'FORBIDDEN'],
    ['INVALID_PROFILE', 400, 'VALIDATION_ERROR'],
  ] as const)('maps domain error %s', (domainCode, statusCode, code) => {
    expect(rpcError(new DomainError(domainCode, 'Safe message'))).toEqual({
      statusCode,
      code,
      message: 'Safe message',
    });
  });

  it.each([new Error('password=secret'), 'secret', undefined, null])(
    'sanitizes unexpected errors: %p',
    (error) => {
      expect(rpcError(error)).toEqual({
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal identity service error',
      });
    },
  );

  it('emits the RPC error and logs only request context', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => {});
    const request = {
      meta: { requestId: 'req-1', operationId: 'identity.me.get' },
      user: { sub: 'alice', token: 'secret' },
    };
    const host = {
      switchToRpc: () => ({ getData: () => request }),
    } as unknown as ArgumentsHost;
    await expect(
      firstValueFrom(
        new IdentityErrorFilter().catch(new Error('password=secret'), host),
      ),
    ).rejects.toEqual(rpcError(new Error()));
    expect(JSON.parse(warn.mock.calls[0][0])).toEqual({
      requestId: 'req-1',
      actor: 'alice',
      operation: 'identity.me.get',
      result: 'INTERNAL_ERROR',
    });
  });
});
