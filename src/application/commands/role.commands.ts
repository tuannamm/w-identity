import type { CreateRole, RolePatch } from '../../domain/models/role';
import type { Actor } from '../security/actor';

export class CreateRoleCommand {
  constructor(
    readonly input: CreateRole,
    readonly actor: Actor,
  ) {}
}
export class UpdateRoleCommand {
  constructor(
    readonly input: { name: string; patch: RolePatch },
    readonly actor: Actor,
  ) {}
}
export class DeleteRoleCommand {
  constructor(
    readonly input: { name: string },
    readonly actor: Actor,
  ) {}
}
export class GrantPermissionToRoleCommand {
  constructor(
    readonly input: { name: string; permissionKey: string },
    readonly actor: Actor,
  ) {}
}
export class RevokePermissionFromRoleCommand {
  constructor(
    readonly input: { name: string; permissionKey: string },
    readonly actor: Actor,
  ) {}
}
export class AssignRoleToUserCommand {
  constructor(
    readonly input: { userId: string; roleName: string },
    readonly actor: Actor,
  ) {}
}
