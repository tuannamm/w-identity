export interface UserAccount {
  userId: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  enabled: boolean;
  emailVerified: boolean;
  roles: string[];
}
export interface CreateAccount {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}
export type AccountPatch = Partial<
  Pick<CreateAccount, 'email' | 'firstName' | 'lastName'>
>;
export interface UserSearch {
  search?: string;
  enabled?: boolean;
  offset: number;
  limit: number;
}
