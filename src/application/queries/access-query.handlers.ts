import { ApplicationError } from '../errors/application-error';
import { AccessResolver } from '../security/access-resolver';
import { AuthorizationPolicy } from '../security/authorization.policy';
import { GetMyAccessQuery, ResolveUserAccessQuery } from './access.queries';
export class GetMyAccessHandler {
  constructor(
    private readonly access: AccessResolver,
    private readonly auth: AuthorizationPolicy,
  ) {}
  async execute({ actor }: GetMyAccessQuery) {
    this.auth.authenticated(actor);
    const result = await this.access.resolve(actor.userId, true);
    return {
      userId: result.userId,
      role: result.role,
      permissions: result.permissions,
    };
  }
}
export class ResolveUserAccessHandler {
  constructor(private readonly access: AccessResolver) {}
  async execute({ userId }: ResolveUserAccessQuery) {
    try {
      const { permissions } = await this.access.resolve(userId);
      return { permissions };
    } catch (error) {
      if (
        error instanceof ApplicationError &&
        error.code === 'USER_NOT_FOUND'
      ) {
        return { permissions: [] };
      }
      throw error;
    }
  }
}
