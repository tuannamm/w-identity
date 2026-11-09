import {
  ApplicationError,
  type ErrorCode,
} from '../../../application/errors/application-error';

/**
 * Maps the shared repository's duplicate-key signal to a stable application error;
 * every other storage failure is already sanitized by MongoDBRepository.execute.
 */
export async function guardConflict<T>(
  operation: () => Promise<T>,
  code: Extract<ErrorCode, 'ROLE_CONFLICT' | 'PERMISSION_CONFLICT'>,
  message: string,
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if ((error as { code?: string })?.code === 'DATABASE_CONFLICT')
      throw new ApplicationError(code, message);
    throw error;
  }
}
