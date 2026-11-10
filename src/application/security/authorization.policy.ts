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
  /**
   * Account/RBAC management. The gateway has already enforced the operation's
   * `x-required-permissions` (users:write, roles:write, ...) before the request
   * reaches this service, so here we only re-verify the caller is authenticated
   * by the trusted issuer. Requests that bypass the gateway must be blocked at
   * the network level (the TCP port is internal).
   */
  management(actor?: Actor): void {
    this.authenticated(actor);
  }
}
