import { KeycloakError } from '@lib-infrastructure/keycloak';
import { ApplicationError } from '../../application/errors/application-error';

export function mapKeycloakError(error: unknown): never {
  if (!(error instanceof KeycloakError)) throw error;
  if (error.operationUncertain)
    throw new ApplicationError(
      'OPERATION_UNCERTAIN',
      'Identity operation result is unknown; reconcile before retrying',
    );
  if (error.kind === 'http') {
    switch (error.status) {
      case 404:
        throw new ApplicationError('USER_NOT_FOUND', 'User not found');
      case 409:
        throw new ApplicationError(
          'ACCOUNT_CONFLICT',
          'Username or email already exists',
        );
      case 400:
        throw new ApplicationError(
          'VALIDATION_ERROR',
          'Identity provider rejected account data',
        );
      case 401:
      case 403:
        throw new ApplicationError(
          'DEPENDENCY_FORBIDDEN',
          'Identity service account lacks required permissions',
        );
    }
  }
  throw new ApplicationError(
    'DEPENDENCY_UNAVAILABLE',
    error.kind === 'authentication'
      ? 'Identity provider authentication unavailable'
      : error.kind === 'invalid_response'
        ? 'Invalid identity provider response'
        : error.kind === 'network' || error.kind === 'timeout'
          ? 'Identity provider unavailable'
          : 'Identity provider operation failed',
  );
}
