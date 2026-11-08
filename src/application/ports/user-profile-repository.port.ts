import type {
  ProfilePatch,
  UserProfile,
} from '../../domain/models/user-profile';
export interface UserProfileRepositoryPort {
  getOrCreate(userId: string): Promise<UserProfile>;
  update(userId: string, input: ProfilePatch): Promise<UserProfile>;
}
