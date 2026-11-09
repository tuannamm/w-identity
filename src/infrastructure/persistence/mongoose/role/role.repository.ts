import { Injectable } from '@nestjs/common';
import { MongoDBRepository } from '@lib-infrastructure/database';
import type { RoleRepositoryPort } from '../../../../application/ports/role-repository.port';
import type { Role, RolePatch } from '../../../../domain/models/role';
import {
  RolePersistenceEntity,
  type RoleRecord,
} from './role-persistence.entity';
import { guardConflict } from '../persistence-guard';

@Injectable()
export class RoleRepository
  extends MongoDBRepository<RoleRecord>
  implements RoleRepositoryPort
{
  readonly entity = RolePersistenceEntity;
  private toDomain(record: RoleRecord): Role {
    return {
      name: record.name,
      description: record.description,
      permissionKeys: record.permissionKeys ?? [],
      system: record.system === true,
      createdAt: record.createdAt.toISOString(),
      updatedAt: record.updatedAt.toISOString(),
    };
  }
  async insert(input: {
    name: string;
    description?: string;
    permissionKeys: string[];
  }): Promise<Role> {
    const record = await guardConflict(
      () => this.create({ ...input, system: false }),
      'ROLE_CONFLICT',
      'Role already exists',
    );
    return this.toDomain(record);
  }
  async ensureSystemRole(input: {
    name: string;
    description?: string;
    permissionKeys: string[];
  }): Promise<void> {
    await this.execute(async () => {
      await this.model
        .updateOne(
          { name: input.name },
          {
            $set: { system: true, description: input.description },
            $addToSet: { permissionKeys: { $each: input.permissionKeys } },
          },
          { upsert: true },
        )
        .exec();
    });
  }
  async findByName(name: string): Promise<Role | null> {
    const record = await this.findOne({ name });
    return record ? this.toDomain(record) : null;
  }
  async list(): Promise<Role[]> {
    return (await this.find({}, { sort: { name: 1 } })).map((record) =>
      this.toDomain(record),
    );
  }
  private async mutate(
    name: string,
    update: Record<string, unknown>,
  ): Promise<Role | null> {
    const record = await this.execute(() =>
      this.model
        .findOneAndUpdate({ name, system: { $ne: true } }, update, {
          returnDocument: 'after',
          runValidators: true,
        })
        .lean<RoleRecord | null>()
        .exec(),
    );
    return record ? this.toDomain(record) : null;
  }
  // Filters on `system: { $ne: true }` so a race can never modify a system role.
  updateDescription(name: string, patch: RolePatch): Promise<Role | null> {
    return this.mutate(name, { $set: patch });
  }
  addPermission(name: string, key: string): Promise<Role | null> {
    return this.mutate(name, { $addToSet: { permissionKeys: key } });
  }
  removePermission(name: string, key: string): Promise<Role | null> {
    return this.mutate(name, { $pull: { permissionKeys: key } });
  }
  async delete(name: string): Promise<boolean> {
    return this.execute(
      async () =>
        (await this.model.deleteOne({ name, system: { $ne: true } }).exec())
          .deletedCount === 1,
    );
  }
  countByPermission(key: string): Promise<number> {
    return this.count({ permissionKeys: key });
  }
}
