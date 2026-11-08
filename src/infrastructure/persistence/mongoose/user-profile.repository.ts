import { Schema, type Model } from 'mongoose';
import type { ProfilePatch, UserProfile } from '../../../domain/models/user-profile';
import type { UserProfileRepositoryPort } from '../../../application/ports/user-profile-repository.port';
import { ApplicationError } from '../../../application/errors/application-error';
export interface ProfileRecord extends ProfilePatch { keycloakUserId: string; createdAt: Date; updatedAt: Date }
export const PROFILE_MODEL = 'UserProfile';
export const ProfileSchema = new Schema<ProfileRecord>({
  keycloakUserId: { type: String, required: true, unique: true }, avatarUrl: String, phoneNumber: String, timezone: String, locale: String,
}, { timestamps: true, versionKey: false, bufferCommands: false, collection: 'user_profiles' });
export class MongooseUserProfileRepository implements UserProfileRepositoryPort {
  constructor(private readonly model: Model<ProfileRecord>) {}
  private map(record: ProfileRecord): UserProfile {
    return { userId: record.keycloakUserId, avatarUrl: record.avatarUrl, phoneNumber: record.phoneNumber, timezone: record.timezone,
      locale: record.locale, createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
  }
  async getOrCreate(userId: string) { return this.write(userId, {}); }
  async update(userId: string, patch: ProfilePatch) { return this.write(userId, patch); }
  private async write(userId: string, patch: ProfilePatch): Promise<UserProfile> {
    const filter = { keycloakUserId: userId };
    const update = { $set: patch, $setOnInsert: { keycloakUserId: userId } };
    try {
      let record: ProfileRecord | null;
      try { record = await this.model.findOneAndUpdate(filter, update, { upsert: true, returnDocument: 'after', runValidators: true, setDefaultsOnInsert: true }).lean().exec(); }
      catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        record = await this.model.findOneAndUpdate(filter, { $set: patch }, { returnDocument: 'after', runValidators: true }).lean().exec();
      }
      if (!record) throw new Error('Missing profile');
      return this.map(record);
    } catch { throw new ApplicationError('DEPENDENCY_UNAVAILABLE', 'Profile storage unavailable'); }
  }
}
