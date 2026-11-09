import type { Actor } from '../security/actor';
export class GetMyAccessQuery {
  constructor(readonly actor: Actor) {}
}
export class ResolveUserAccessQuery {
  constructor(readonly userId: string) {}
}
