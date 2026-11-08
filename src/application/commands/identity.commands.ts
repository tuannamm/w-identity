import type {
  CreateAccount,
  AccountPatch,
} from '../../domain/models/user-account';
import type { ProfilePatch } from '../../domain/models/user';
import type { Actor } from '../security/actor';

export class CreateUserCommand {
  constructor(
    readonly input: CreateAccount,
    readonly actor: Actor,
  ) {}
}

export class UpdateUserCommand {
  constructor(
    readonly input: { userId: string; patch: AccountPatch },
    readonly actor: Actor,
  ) {}
}

export class SetUserStatusCommand {
  constructor(
    readonly input: { userId: string; enabled: boolean },
    readonly actor: Actor,
  ) {}
}

export class SendPasswordResetEmailCommand {
  constructor(
    readonly input: { userId: string },
    readonly actor: Actor,
  ) {}
}

export class UpdateMyProfileCommand {
  constructor(
    readonly input: ProfilePatch,
    readonly actor: Actor,
  ) {}
}
