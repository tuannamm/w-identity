import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const {
  DatabaseModule,
  getDatabaseConnectionToken,
} = require('@lib-infrastructure/database');
const {
  UserRepository,
} = require('../dist/infrastructure/persistence/mongoose/user.repository.js');
export async function verifyMongoRepository() {
  const dbName = `identity_test_${randomUUID().replaceAll('-', '')}`;
  class ProfileTestModule {}
  Module({
    imports: [
      DatabaseModule.forRoot({
        uri:
          process.env.IDENTITY_TEST_MONGO_URI ??
          'mongodb://admin:admin123@localhost:27017/?authSource=admin',
        dbName,
        serverSelectionTimeoutMS: 2000,
      }),
      DatabaseModule.forFeature([UserRepository]),
    ],
  })(ProfileTestModule);
  const app = await NestFactory.createApplicationContext(ProfileTestModule, {
    logger: false,
    abortOnError: false,
  });
  const connection = app.get(getDatabaseConnectionToken());
  const repository = app.get(UserRepository);
  try {
    const profiles = await Promise.all(
      Array.from({ length: 20 }, () => repository.getOrCreate('concurrent')),
    );
    assert.equal(await repository.count({ keycloakUserId: 'concurrent' }), 1);
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
    await app.close();
  }
  await assert.rejects(repository.getOrCreate('offline'), {
    code: 'DEPENDENCY_UNAVAILABLE',
  });
  console.log(
    'PASS MongoDB: unavailable storage produces a sanitized application error',
  );
}
