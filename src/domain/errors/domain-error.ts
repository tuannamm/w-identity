export type DomainErrorCode = 'ACCOUNT_DISABLED' | 'INVALID_PROFILE';

/** Business failure with no framework, transport or database dependency. */
export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
