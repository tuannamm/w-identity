import type {
  AccountPatch,
  CreateAccount,
  UserAccount,
  UserSearch,
} from '../../domain/models/user-account';
import type { ApplicationRole } from '../../domain/policies/application-role.policy';
export interface IdentityProviderPort {
  create(input: CreateAccount): Promise<UserAccount>;
  get(userId: string): Promise<UserAccount>;
  list(input: UserSearch): Promise<UserAccount[]>;
  update(userId: string, input: AccountPatch): Promise<void>;
  setEnabled(userId: string, enabled: boolean): Promise<void>;
  logout(userId: string): Promise<void>;
  listRoles(): Promise<ApplicationRole[]>;
  assignRole(userId: string, role: ApplicationRole): Promise<void>;
  removeRole(userId: string, role: ApplicationRole): Promise<void>;
  sendPasswordReset(userId: string): Promise<void>;
}
