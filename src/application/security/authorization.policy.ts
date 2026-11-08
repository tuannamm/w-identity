import type { Actor } from './actor';
import { ApplicationError } from '../errors/application-error';
export class AuthorizationPolicy {
  constructor(private readonly issuer: string) {}
  authenticated(actor?: Actor): asserts actor is Actor {
    if (!actor?.userId || actor.issuer !== this.issuer)
      throw new ApplicationError(
        'UNAUTHENTICATED',
        'Authenticated identity is required',
      );
  }
  management(actor?: Actor): void {
    this.authenticated(actor);
    throw new ApplicationError('FORBIDDEN', 'Account management is temporarily unavailable');
  }
}
