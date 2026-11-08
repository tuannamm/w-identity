import { test } from '@jest/globals';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
const require = createRequire(import.meta.url);
const { Module } = require('@nestjs/common');
const { NestFactory } = require('@nestjs/core');
const { Transport, ClientProxyFactory } = require('@nestjs/microservices');
const { firstValueFrom, timeout } = require('rxjs');
const {
  DatabaseModule,
  getDatabaseConnectionToken,
} = require('@lib-infrastructure/database');
const {
  UserRepository,
} = require('../dist/infrastructure/persistence/mongoose/user.repository.js');
const {
  AuthorizationPolicy,
} = require('../dist/application/security/authorization.policy.js');
const {
  IdentityController,
} = require('../dist/presentation/tcp/identity.controller.js');
const {
  IdentityCqrsHandlers,
} = require('../dist/presentation/cqrs/identity.handlers.js');
const {
  IDENTITY_PROVIDER,
  USER_REPOSITORY,
} = require('../dist/bootstrap/tokens.js');
const { CqrsModule, CommandBus, QueryBus } = require('@nestjs/cqrs');
const Commands = require('../dist/application/commands/identity.commands.js');
const Queries = require('../dist/application/queries/identity.queries.js');

// Exercise real TCP controller/filter/use cases/domain/repository/MongoDB.
// Account lookup is a stub so management/Keycloak setup is outside this fixture.
test('profile policy over TCP and MongoDB', async () => {
  const issuer = 'profile-test-issuer';
  let enabled = true;
  const identity = { get: async (userId) => ({ userId, enabled }) };
  const dbName = `profile_policy_test_${randomUUID().replaceAll('-', '')}`;
  class TestModule {}
  Module({
    imports: [
      CqrsModule.forRoot(),
      DatabaseModule.forRoot({
        uri:
          process.env.IDENTITY_TEST_MONGO_URI ??
          'mongodb://admin:admin123@localhost:27017/?authSource=admin',
        dbName,
      }),
      DatabaseModule.forFeature([UserRepository]),
    ],
    controllers: [IdentityController],
    providers: [
      { provide: IDENTITY_PROVIDER, useValue: identity },
      { provide: USER_REPOSITORY, useExisting: UserRepository },
      {
        provide: AuthorizationPolicy,
        useValue: new AuthorizationPolicy(issuer),
      },
      ...IdentityCqrsHandlers,
    ],
  })(TestModule);
  const socket = createServer();
  await new Promise((resolve, reject) => {
    socket.once('error', reject);
    socket.listen(0, '127.0.0.1', resolve);
  });
  const port = socket.address().port;
  await new Promise((resolve) => socket.close(resolve));
  const app = await NestFactory.createMicroservice(TestModule, {
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
    logger: false,
    abortOnError: false,
  });
  const connection = app.get(getDatabaseConnectionToken());
  const repository = app.get(UserRepository);
  const client = ClientProxyFactory.create({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port },
  });
  const send = (pattern, body, actor = 'alice') =>
    firstValueFrom(
      client
        .send(pattern, {
          body,
          user: { sub: actor, iss: issuer },
          meta: { requestId: randomUUID() },
        })
        .pipe(timeout(5000)),
    );
  try {
    await app.listen();
    const actor = { userId: 'alice', issuer };
    // Every registered adapter must be dispatchable and preserve management authorization.
    const blockedCommands = [
      new Commands.CreateUserCommand(
        { username: 'x', email: 'x@example.test' },
        actor,
      ),
      new Commands.UpdateUserCommand({ userId: 'alice', patch: {} }, actor),
      new Commands.SetUserStatusCommand(
        { userId: 'alice', enabled: false },
        actor,
      ),
      new Commands.SendPasswordResetEmailCommand({ userId: 'alice' }, actor),
    ];
    for (const command of blockedCommands) {
      await assert.rejects(
        app.get(CommandBus).execute(command),
        (error) => error.code === 'FORBIDDEN',
      );
    }
    for (const query of [
      new Queries.GetUserQuery({ userId: 'alice' }, actor),
      new Queries.ListUsersQuery({ offset: 0, limit: 10 }, actor),
    ]) {
      await assert.rejects(
        app.get(QueryBus).execute(query),
        (error) => error.code === 'FORBIDDEN',
      );
    }

    const missing = await send('identity.me.get', {});
    assert.equal(missing.profile, null);
    assert.equal(await repository.count(), 0);
    const queried = await app
      .get(QueryBus)
      .execute(new Queries.GetMeQuery({ userId: 'alice', issuer }));
    assert.equal(queried.profile, null);
    assert.equal(await repository.count(), 0);
    await send('identity.me.updateProfile', {
      locale: 'vi',
      timezone: 'Asia/Ho_Chi_Minh',
    });
    const me = await send('identity.me.get', {});
    assert.equal(me.profile.locale, 'vi');
    await app
      .get(CommandBus)
      .execute(
        new Commands.UpdateMyProfileCommand(
          { phoneNumber: '+84901234567' },
          { userId: 'alice', issuer },
        ),
      );
    assert.equal(
      (await repository.findByUserId('alice')).phoneNumber,
      '+84901234567',
    );
    assert.equal(me.profile.userId, 'alice');
    assert.equal('_id' in me.profile, false);
    for (const input of [
      { timezone: 'Not/AZone' },
      { locale: 'not_a_locale' },
      { avatarUrl: 'javascript:alert(1)' },
      { userId: 'victim' },
      {},
    ]) {
      await assert.rejects(
        send('identity.me.updateProfile', input),
        (error) =>
          error.code === 'VALIDATION_ERROR' && error.statusCode === 400,
      );
    }
    assert.equal((await repository.findByUserId('alice')).locale, 'vi');
    assert.equal(await repository.count(), 1);
    enabled = false;
    for (const pattern of ['identity.me.get', 'identity.me.updateProfile']) {
      await assert.rejects(
        send(pattern, { locale: 'en' }, 'disabled'),
        (error) => error.code === 'FORBIDDEN' && error.statusCode === 403,
      );
    }
    assert.equal(await repository.count({ keycloakUserId: 'disabled' }), 0);
    assert.equal((await repository.findByUserId('alice')).locale, 'vi');
    console.log(
      'PASS CQRS/TCP/MongoDB: all command/query adapters dispatch, queries do not create profiles, commands persist updates, safe 400/403 errors',
    );
  } finally {
    client.close();
    try {
      await connection.dropDatabase();
    } finally {
      await app.close();
    }
  }
}, 180_000);
