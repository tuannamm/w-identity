import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { createConnection } = require('mongoose');
const {
  MongooseUserProfileRepository,
  ProfileSchema,
} = require('../dist/infrastructure/persistence/mongoose/user-profile.repository.js');
export async function verifyMongoRepository() {
  const dbName = `identity_test_${randomUUID().replaceAll('-', '')}`;
  const connection = await createConnection(
    process.env.IDENTITY_TEST_MONGO_URI ??
      'mongodb://admin:admin123@localhost:27017/?authSource=admin',
    { dbName, serverSelectionTimeoutMS: 2000 },
  ).asPromise();
  const model = connection.model('UserProfile', ProfileSchema);
  try {
    await model.init();
    const repository = new MongooseUserProfileRepository(model);
    const profiles = await Promise.all(
      Array.from({ length: 20 }, () => repository.getOrCreate('concurrent')),
    );
    assert.equal(
      await model.countDocuments({ keycloakUserId: 'concurrent' }),
      1,
    );
    assert.ok(
      profiles.every((p) => p.userId === 'concurrent' && !('_id' in p)),
    );
    const updated = await repository.update('concurrent', {
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    assert.equal(updated.locale, 'vi');
    assert.equal(
      (await repository.getOrCreate('concurrent')).timezone,
      'Asia/Ho_Chi_Minh',
    );
    console.log(
      'PASS MongoDB: unique index, 20 concurrent upserts, profile persistence and public mapping',
    );
  } finally {
    await connection.dropDatabase();
    await connection.close();
  }
  const closedRepository = new MongooseUserProfileRepository(model);
  await assert.rejects(closedRepository.getOrCreate('offline'), {
    code: 'DEPENDENCY_UNAVAILABLE',
  });
  console.log(
    'PASS MongoDB: unavailable storage produces a sanitized application error',
  );
}
if (process.argv[1]?.endsWith('mongo.integration.mjs'))
  await verifyMongoRepository();
