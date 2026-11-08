export type ErrorCode =
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'VALIDATION_ERROR'
  | 'USER_NOT_FOUND'
  | 'ACCOUNT_CONFLICT'
  | 'DEPENDENCY_UNAVAILABLE'
  | 'DEPENDENCY_FORBIDDEN'
  | 'OPERATION_UNCERTAIN'
  | 'ACCOUNT_DISABLED_SESSION_FAILED';
export class ApplicationError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}
