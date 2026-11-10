import type {
  AccountPatch,
  CreateAccount,
  UserAccount,
  UserSearch,
} from '../../domain/models/user-account';
export interface IdentityProviderPort {
  create(input: CreateAccount): Promise<UserAccount>;
  /** Exact (case-insensitive) username match; null when absent. */
  findByUsername(username: string): Promise<UserAccount | null>;
  get(userId: string): Promise<UserAccount>;
  list(input: UserSearch): Promise<UserAccount[]>;
  update(userId: string, input: AccountPatch): Promise<void>;
  setEnabled(userId: string, enabled: boolean): Promise<void>;
  logout(userId: string): Promise<void>;
  /** Sets a password that Keycloak forces the user to change at first login. */
  setTemporaryPassword(userId: string, password: string): Promise<void>;
  sendPasswordReset(userId: string): Promise<void>;
}
