import type { Actor } from './actor';
import { ApplicationError } from '../errors/application-error';
export class AuthorizationPolicy {
  constructor(private readonly issuer: string) {}
  authenticated(actor?: Actor): asserts actor is Actor {
    if (!actor?.userId || actor.issuer !== this.issuer) throw new ApplicationError('UNAUTHENTICATED', 'Authenticated identity is required');
  }
  admin(actor?: Actor): asserts actor is Actor {
    this.authenticated(actor);
    if (!actor.roles.includes('admin')) throw new ApplicationError('FORBIDDEN', 'Administrator role is required');
  }
}
