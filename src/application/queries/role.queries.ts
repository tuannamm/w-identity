import type { Actor } from '../security/actor';

export class ListRolesQuery {
  constructor(readonly actor: Actor) {}
}
export class GetRoleQuery {
  constructor(
    readonly input: { name: string },
    readonly actor: Actor,
  ) {}
}
export class GetUserRoleQuery {
  constructor(
    readonly input: { userId: string },
    readonly actor: Actor,
  ) {}
}
export class GetUserPermissionsQuery {
  constructor(
    readonly input: { userId: string },
    readonly actor: Actor,
  ) {}
}
