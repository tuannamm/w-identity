import {
  Catch,
  type ArgumentsHost,
  type ExceptionFilter,
  Logger,
} from '@nestjs/common';
import { throwError } from 'rxjs';
import { ApplicationError } from '../../../application/errors/application-error';
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
  ACCOUNT_CREATED_ROLE_FAILED: 502,
  ACCOUNT_DISABLED_SESSION_FAILED: 502,
};
export function rpcError(error: unknown): GatewayRpcError {
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
