import { ApplicationError } from '../errors/application-error';
import type { IdentityProviderPort } from '../ports/identity-provider.port';
import type { RoleRepositoryPort } from '../ports/role-repository.port';
import type { UserRoleRepositoryPort } from '../ports/user-role-repository.port';
import {
  DEFAULT_ROLE_NAME,
  resolveEffectiveAccess,
} from '../../domain/policies/role.policy';
import { assertActiveAccount } from '../../domain/policies/profile.policy';

export class AccessResolver {
  constructor(
    private readonly identity: IdentityProviderPort,
    private readonly roles: RoleRepositoryPort,
    private readonly userRoles: UserRoleRepositoryPort,
  ) {}
  async resolve(userId: string, requireActive = false) {
    const account = await this.identity.get(userId);
    if (requireActive) assertActiveAccount(account);
    if (!account.enabled)
      return {
        userId: account.userId,
        role: null,
        permissions: [] as string[],
      };
    const assignment = await this.userRoles.findByUserId(account.userId);
    const role = await this.roles.findByName(
      assignment?.roleName ?? DEFAULT_ROLE_NAME,
    );
    if (!role) throw new ApplicationError('ROLE_NOT_FOUND', 'Role not found');
    return {
      userId: account.userId,
      ...resolveEffectiveAccess(assignment, [role]),
    };
  }
}
