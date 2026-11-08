import type { UserSearch } from '../../domain/models/user-account';
import type { Actor } from '../security/actor';

export class ListUsersQuery {
  constructor(
    readonly input: UserSearch,
    readonly actor: Actor,
  ) {}
}

export class GetUserQuery {
  constructor(
    readonly input: { userId: string },
    readonly actor: Actor,
  ) {}
}

export class GetMeQuery {
  constructor(readonly actor: Actor) {}
}
