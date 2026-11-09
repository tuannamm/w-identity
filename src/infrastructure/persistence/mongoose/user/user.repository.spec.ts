import assert from 'node:assert/strict';
import type { Model } from 'mongoose';
import { DatabaseError } from '@lib-infrastructure/database';
import { UserRepository } from './user.repository';
import type { ProfileRecord } from './user-persistence.entity';
it('reads an absent profile without upserting and sanitizes read failures', async () => {
  const findOne = jest.fn(() => ({ lean: () => ({ exec: async () => null }) }));
  const repository = new UserRepository({
    findOne,
  } as unknown as Model<ProfileRecord>);
  expect(await repository.findByUserId('missing')).toBeNull();
  expect(findOne).toHaveBeenCalledWith({ keycloakUserId: 'missing' });
  const offline = new UserRepository({
    findOne() {
      throw new Error('mongodb://private:secret@host');
    },
  } as unknown as Model<ProfileRecord>);
  await expect(offline.findByUserId('missing')).rejects.toMatchObject({
    code: 'DEPENDENCY_UNAVAILABLE',
    message: 'Profile storage unavailable',
  });
});
it('profile repository retries duplicate-key races and maps storage errors safely', async () => {
  const calls: any[][] = [];
  const record = {
    keycloakUserId: 'alice',
    locale: 'vi',
    _id: 'internal',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
  };
  const repository = new UserRepository({
    findOneAndUpdate(...args: any[]) {
      calls.push(args);
      return {
        lean: () => ({
          exec: async () => {
            if (calls.length === 1) throw { code: 11000 };
            return record;
          },
        }),
      };
    },
  } as unknown as Model<ProfileRecord>);
  const profile = await repository.update('alice', { locale: 'vi' });
  assert.equal(profile.userId, 'alice');
  assert.equal(profile.createdAt, '2026-01-01T00:00:00.000Z');
  assert.equal('_id' in profile, false);
  assert.equal(calls[0][2].upsert, true);
  assert.equal(calls[1][2].upsert, undefined);
  const unavailable = new UserRepository({
    findOneAndUpdate() {
      throw new Error('mongodb://private:secret@host');
    },
  } as unknown as Model<ProfileRecord>);
  await assert.rejects(
    unavailable.update('alice', { locale: 'vi' }),
    (error) => {
      assert.ok(error instanceof DatabaseError);
      assert.equal(error.code, 'DEPENDENCY_UNAVAILABLE');
      assert.doesNotMatch(error.stack ?? '', /private|secret/);
      return true;
    },
  );
});
