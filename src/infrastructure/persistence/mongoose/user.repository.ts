import { Injectable } from '@nestjs/common';
import { DatabaseError, MongoDBRepository } from '@lib-infrastructure/database';
import type { UserRepositoryPort } from '../../../application/ports/user-repository.port';
import type { ProfilePatch, User } from '../../../domain/models/user';
import {
  UserPersistenceEntity,
  type ProfileRecord,
} from './user-persistence.entity';

@Injectable()
export class UserRepository
  extends MongoDBRepository<ProfileRecord>
  implements UserRepositoryPort
{
  readonly entity = UserPersistenceEntity;
  private map(record: ProfileRecord): User {
    return {
      userId: record.keycloakUserId,
      avatarUrl: record.avatarUrl,
      phoneNumber: record.phoneNumber,
      timezone: record.timezone,
      locale: record.locale,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
  async findByUserId(userId: string): Promise<User | null> {
    try {
      const record = await this.model
        .findOne({ keycloakUserId: userId })
        .lean()
        .exec();
      return record ? this.map(record) : null;
    } catch {
      throw new DatabaseError('Profile storage unavailable');
    }
  }
  async getOrCreate(userId: string): Promise<User> {
    return this.write(userId, {});
  }
  async update(userId: string, patch: ProfilePatch): Promise<User> {
    return this.write(userId, patch);
  }
  private async write(userId: string, patch: ProfilePatch): Promise<User> {
    const filter = { keycloakUserId: userId };
    const update = { $set: patch, $setOnInsert: { keycloakUserId: userId } };
    try {
      let record: ProfileRecord | null;
      try {
        record = await this.model
          .findOneAndUpdate(filter, update, {
            upsert: true,
            returnDocument: 'after',
            runValidators: true,
            setDefaultsOnInsert: true,
          })
          .lean()
          .exec();
      } catch (error) {
        if ((error as { code?: number }).code !== 11000) throw error;
        record = await this.model
          .findOneAndUpdate(
            filter,
            { $set: patch },
            { returnDocument: 'after', runValidators: true },
          )
          .lean()
          .exec();
      }
      if (!record) throw new Error('Missing profile');
      return this.map(record);
    } catch {
      throw new DatabaseError('Profile storage unavailable');
    }
  }
}
