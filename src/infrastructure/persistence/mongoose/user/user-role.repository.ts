import { Injectable } from '@nestjs/common';
import { MongoDBRepository } from '@lib-infrastructure/database';
import type { UserRoleRepositoryPort } from '../../../../application/ports/user-role-repository.port';
import type { UserRole } from '../../../../domain/models/role';
import {
  UserRolePersistenceEntity,
  type UserRoleRecord,
} from './user-role-persistence.entity';

@Injectable()
export class UserRoleRepository
  extends MongoDBRepository<UserRoleRecord>
  implements UserRoleRepositoryPort
{
  readonly entity = UserRolePersistenceEntity;
  private toDomain(record: UserRoleRecord): UserRole {
    return { userId: record.keycloakUserId, roleName: record.roleName };
  }
  async findByUserId(userId: string): Promise<UserRole | null> {
    const record = await this.findOne({ keycloakUserId: userId });
    return record ? this.toDomain(record) : null;
  }
  async set(userId: string, roleName: string): Promise<UserRole> {
    const filter = { keycloakUserId: userId };
    const update = { $set: { roleName } };
    const record = await this.execute(async () => {
      try {
        return await this.model
          .findOneAndUpdate(filter, update, {
            upsert: true,
            returnDocument: 'after',
            runValidators: true,
          })
          .lean<UserRoleRecord | null>()
          .exec();
      } catch (error) {
        // Two first-time assignments racing on the unique index: the loser just updates.
        if ((error as { code?: number }).code !== 11000) throw error;
        return this.model
          .findOneAndUpdate(filter, update, {
            returnDocument: 'after',
            runValidators: true,
          })
          .lean<UserRoleRecord | null>()
          .exec();
      }
    });
    if (!record) throw new Error('Missing user role');
    return this.toDomain(record);
  }
  countByRole(roleName: string): Promise<number> {
    return this.count({ roleName });
  }
}
