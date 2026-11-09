import type { CreatePermission } from '../../domain/models/permission';
import type { Actor } from '../security/actor';

export class CreatePermissionCommand {
  constructor(
    readonly input: CreatePermission,
    readonly actor: Actor,
  ) {}
}
export class DeletePermissionCommand {
  constructor(
    readonly input: { key: string },
    readonly actor: Actor,
  ) {}
}
