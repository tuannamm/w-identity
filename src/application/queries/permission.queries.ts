import type { Actor } from '../security/actor';

export class ListPermissionsQuery {
  constructor(readonly actor: Actor) {}
}
export class GetPermissionQuery {
  constructor(
    readonly input: { key: string },
    readonly actor: Actor,
  ) {}
}
