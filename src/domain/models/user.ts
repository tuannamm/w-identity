export interface ProfilePatch {
  avatarUrl?: string;
  phoneNumber?: string;
  timezone?: string;
  locale?: string;
}
export interface User extends ProfilePatch {
  userId: string;
  createdAt: string;
  updatedAt: string;
}
