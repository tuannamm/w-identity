import type { Model } from 'mongoose';
import { DatabaseError } from '@lib-infrastructure/database';
import { PermissionRepository } from './permission/permission.repository';
import { RoleRepository } from './role/role.repository';
import { UserRoleRepository } from './user/user-role.repository';
import type { PermissionRecord } from './permission/permission-persistence.entity';
import type { RoleRecord } from './role/role-persistence.entity';
import type { UserRoleRecord } from './user/user-role-persistence.entity';

const created = new Date('2026-01-01');
const lean = (value: unknown) => ({
  lean: () => ({ exec: async () => value }),
});
const exec = (value: unknown) => ({ exec: async () => value });
const asModel = <T>(model: object) => model as unknown as Model<T>;

describe('PermissionRepository', () => {
  it('maps a duplicate key to PERMISSION_CONFLICT', async () => {
    const repository = new PermissionRepository(
      asModel<PermissionRecord>({
        create: async () => {
          throw { code: 11000 };
        },
      }),
    );
    await expect(repository.insert({ key: 'a:b' })).rejects.toMatchObject({
      code: 'PERMISSION_CONFLICT',
    });
  });
  it('inserts and returns a domain permission without internal fields', async () => {
    const record = {
      _id: 'x',
      key: 'a:b',
      createdAt: created,
      updatedAt: created,
    };
    const repository = new PermissionRepository(
      asModel<PermissionRecord>({
        create: async () => ({ toObject: () => record }),
      }),
    );
    const result = await repository.insert({ key: 'a:b' });
    expect(result).toMatchObject({
      key: 'a:b',
      createdAt: created.toISOString(),
    });
    expect('_id' in result).toBe(false);
  });
  it('seeds with $setOnInsert so existing descriptions are untouched', async () => {
    const updateOne = jest.fn(() => exec({}));
    await new PermissionRepository(
      asModel<PermissionRecord>({ updateOne }),
    ).ensure({
      key: 'a:b',
      description: 'd',
    });
    expect(updateOne).toHaveBeenCalledWith(
      { key: 'a:b' },
      { $setOnInsert: { key: 'a:b', description: 'd' } },
      { upsert: true },
    );
  });
  it('returns an empty list for no keys without querying', async () => {
    const find = jest.fn();
    expect(
      await new PermissionRepository(
        asModel<PermissionRecord>({ find }),
      ).findByKeys([]),
    ).toEqual([]);
    expect(find).not.toHaveBeenCalled();
  });
});

describe('RoleRepository', () => {
  const record: RoleRecord = {
    name: 'editor',
    permissionKeys: ['a:b'],
    system: false,
    createdAt: created,
    updatedAt: created,
  };
  it('maps a duplicate name to ROLE_CONFLICT and forces system=false on insert', async () => {
    const create = jest.fn(async () => {
      throw { code: 11000 };
    });
    await expect(
      new RoleRepository(asModel<RoleRecord>({ create })).insert({
        name: 'editor',
        permissionKeys: [],
      }),
    ).rejects.toMatchObject({ code: 'ROLE_CONFLICT' });
    expect(create).toHaveBeenCalledWith({
      name: 'editor',
      permissionKeys: [],
      system: false,
    });
  });
  it.each([
    ['addPermission', { $addToSet: { permissionKeys: 'a:b' } }],
    ['removePermission', { $pull: { permissionKeys: 'a:b' } }],
  ] as const)(
    '%s is atomic and never touches a system role',
    async (method, update) => {
      const findOneAndUpdate = jest.fn(() => lean(record));
      const result = await new RoleRepository(
        asModel<RoleRecord>({ findOneAndUpdate }),
      )[method]('editor', 'a:b');
      expect(findOneAndUpdate).toHaveBeenCalledWith(
        { name: 'editor', system: { $ne: true } },
        update,
        expect.objectContaining({ returnDocument: 'after' }),
      );
      expect(result?.name).toBe('editor');
    },
  );
  it('returns null when nothing matched (missing or system role)', async () => {
    const repository = new RoleRepository(
      asModel<RoleRecord>({ findOneAndUpdate: () => lean(null) }),
    );
    expect(
      await repository.updateDescription('admin', { description: 'x' }),
    ).toBeNull();
  });
  it('deletes only non-system roles', async () => {
    const deleteOne = jest.fn(() => exec({ deletedCount: 0 }));
    const repository = new RoleRepository(asModel<RoleRecord>({ deleteOne }));
    expect(await repository.delete('admin')).toBe(false);
    expect(deleteOne).toHaveBeenCalledWith({
      name: 'admin',
      system: { $ne: true },
    });
  });
  it('seeds system roles by adding permissions only', async () => {
    const updateOne = jest.fn(() => exec({}));
    await new RoleRepository(
      asModel<RoleRecord>({ updateOne }),
    ).ensureSystemRole({
      name: 'admin',
      description: 'd',
      permissionKeys: ['a:b'],
    });
    expect(updateOne).toHaveBeenCalledWith(
      { name: 'admin' },
      {
        $set: { system: true, description: 'd' },
        $addToSet: { permissionKeys: { $each: ['a:b'] } },
      },
      { upsert: true },
    );
  });
  it('counts roles by a granted permission via the multikey field', async () => {
    const countDocuments = jest.fn(() => exec(3));
    expect(
      await new RoleRepository(
        asModel<RoleRecord>({ countDocuments }),
      ).countByPermission('a:b'),
    ).toBe(3);
    expect(countDocuments).toHaveBeenCalledWith({ permissionKeys: 'a:b' });
  });
  it('sanitizes storage failures', async () => {
    const repository = new RoleRepository(
      asModel<RoleRecord>({
        findOne() {
          throw new Error('mongodb://private:secret@host');
        },
      }),
    );
    const error = await repository.findByName('x').catch((e) => e);
    expect(error).toBeInstanceOf(DatabaseError);
    expect(error.stack).not.toMatch(/secret/);
  });
});

describe('UserRoleRepository', () => {
  const record: UserRoleRecord = {
    keycloakUserId: 'alice',
    roleName: 'editor',
    createdAt: created,
    updatedAt: created,
  };
  it('upserts the single role and retries a duplicate-key race without upsert', async () => {
    const calls: any[][] = [];
    const findOneAndUpdate = (...args: any[]) => {
      calls.push(args);
      return {
        lean: () => ({
          exec: async () => {
            if (calls.length === 1) throw { code: 11000 };
            return record;
          },
        }),
      };
    };
    const result = await new UserRoleRepository(
      asModel<UserRoleRecord>({ findOneAndUpdate }),
    ).set('alice', 'editor');
    expect(result).toEqual({ userId: 'alice', roleName: 'editor' });
    expect(calls[0][2].upsert).toBe(true);
    expect(calls[1][2].upsert).toBeUndefined();
    expect(calls[0][1]).toEqual({ $set: { roleName: 'editor' } });
  });
  it('finds and counts by role', async () => {
    const findOne = jest.fn(() => lean(record));
    const countDocuments = jest.fn(() => exec(2));
    const repository = new UserRoleRepository(
      asModel<UserRoleRecord>({ findOne, countDocuments }),
    );
    expect(await repository.findByUserId('alice')).toEqual({
      userId: 'alice',
      roleName: 'editor',
    });
    expect(findOne).toHaveBeenCalledWith({ keycloakUserId: 'alice' });
    expect(await repository.countByRole('editor')).toBe(2);
  });
});
