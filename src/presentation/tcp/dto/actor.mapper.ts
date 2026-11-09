import { ApplicationError } from '../../../application/errors/application-error';
import type { Actor } from '../../../application/security/actor';
import type { GatewayRequest } from '../contracts/gateway.contracts';
export function actorOf(req: GatewayRequest): Actor {
  const user = req?.user;
  if (!user || typeof user.sub !== 'string' || typeof user.iss !== 'string')
    throw new ApplicationError(
      'UNAUTHENTICATED',
      'Authenticated identity is required',
    );
  return { userId: user.sub, issuer: user.iss };
}
