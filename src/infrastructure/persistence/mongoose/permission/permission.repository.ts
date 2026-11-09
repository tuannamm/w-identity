import { Injectable } from '@nestjs/common';
import { MongoDBRepository } from '@lib-infrastructure/database';
import type { PermissionRepositoryPort } from '../../../../application/ports/permission-repository.port';
import type {
  CreatePermission,
  Permission,
} from '../../../../domain/models/permission';
import {
  PermissionPersistenceEntity,
  type PermissionRecord,
} from './permission-persistence.entity';
import { guardConflict } from '../persistence-guard';

@Injectable()
export class PermissionRepository
  extends MongoDBRepository<PermissionRecord>
  implements PermissionRepositoryPort
{
  readonly entity = PermissionPersistenceEntity;
  private toDomain(record: PermissionRecord): Permission {
    return {
      key: record.key,
      description: record.description,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
  async insert(input: CreatePermission): Promise<Permission> {
    const record = await guardConflict(
      () => this.create(input),
      'PERMISSION_CONFLICT',
      'Permission already exists',
    );
    return this.toDomain(record);
  }
  async ensure(input: CreatePermission): Promise<void> {
    await this.execute(async () => {
      await this.model
        .updateOne(
          { key: input.key },
          { $setOnInsert: input },
          { upsert: true },
        )
        .exec();
    });
  }
  async findByKey(key: string): Promise<Permission | null> {
    const record = await this.findOne({ key });
    return record ? this.toDomain(record) : null;
  }
  async findByKeys(keys: string[]): Promise<Permission[]> {
    if (!keys.length) return [];
    return (await this.find({ key: { $in: keys } })).map((record) =>
      this.toDomain(record),
    );
  }
  async list(): Promise<Permission[]> {
    return (await this.find({}, { sort: { key: 1 } })).map((record) =>
      this.toDomain(record),
    );
  }
  async delete(key: string): Promise<boolean> {
    return this.execute(
      async () =>
        (await this.model.deleteOne({ key }).exec()).deletedCount === 1,
    );
  }
}
