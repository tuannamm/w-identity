import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { throwError } from 'rxjs';
import { DatabaseError } from '@lib-infrastructure/database';
import { ApplicationError } from '../../../application/errors/application-error';
import { DomainError } from '../../../domain/errors/domain-error';
import type { GatewayRpcError } from '../contracts/gateway.contracts';
const STATUS: Record<ApplicationError['code'], number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  VALIDATION_ERROR: 400,
  USER_NOT_FOUND: 404,
  ACCOUNT_CONFLICT: 409,
  DEPENDENCY_UNAVAILABLE: 503,
  DEPENDENCY_FORBIDDEN: 503,
  OPERATION_UNCERTAIN: 502,
  ACCOUNT_DISABLED_SESSION_FAILED: 502,
  ACCOUNT_CREATED_PASSWORD_FAILED: 502,
  ROLE_NOT_FOUND: 404,
  PERMISSION_NOT_FOUND: 404,
  ROLE_CONFLICT: 409,
  PERMISSION_CONFLICT: 409,
  ROLE_IN_USE: 409,
  PERMISSION_IN_USE: 409,
};
export function rpcError(error: unknown): GatewayRpcError {
  if (error instanceof DomainError) {
    if (error.code === 'SYSTEM_ROLE_PROTECTED')
      return { statusCode: 403, code: error.code, message: error.message };
    return error.code === 'ACCOUNT_DISABLED'
      ? { statusCode: 403, code: 'FORBIDDEN', message: error.message }
      : { statusCode: 400, code: 'VALIDATION_ERROR', message: error.message };
  }
  if (error instanceof DatabaseError) {
    return { statusCode: 503, code: error.code, message: error.message };
  }
  return error instanceof ApplicationError
    ? {
        statusCode: STATUS[error.code],
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      }
    : {
        statusCode: 500,
        code: 'INTERNAL_ERROR',
        message: 'Internal identity service error',
      };
}
@Catch()
export class IdentityErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger('Identity');
  catch(error: unknown, host: ArgumentsHost) {
    const request = host.switchToRpc().getData();
    const payload = rpcError(error);
    this.logger.warn(
      JSON.stringify({
        requestId: request?.meta?.requestId,
        actor: request?.user?.sub,
        operation: request?.meta?.operationId,
        target: request?.params?.id,
        result: payload.code,
      }),
    );
    return throwError(() => payload);
  }
}
