// Uses a disposable realm/database; does not modify the dev pm realm.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { verifyMongoRepository } from './mongo.integration.mjs';
const require = createRequire(import.meta.url);
const appDir = fileURLToPath(new URL('../', import.meta.url));
const gatewayDir = path.resolve(appDir, '../api-gateway');
const gatewayRequire = createRequire(path.join(gatewayDir, 'package.json'));
const { NestFactory } = require('@nestjs/core');
const { SMTPServer } = require('smtp-server');
const { Transport } = require('@nestjs/microservices');
const {
  startRabbitMQ,
  RabbitMQService,
} = require('@lib-infrastructure/rabbitmq');
const amqp = require('amqplib');
const { createConnection } = require('mongoose');
const { getConnectionToken } = require('@nestjs/mongoose');
const { buildGateway } = gatewayRequire('./dist/gateway/bootstrap.js');
const { createGatewayApp } = gatewayRequire('./dist/create-app.js');
const { createRegistryApp } =
  await import('../../service-discovery/dist/create-app.js');
const realm = `identity-test-${randomUUID()}`;
const database = realm.replaceAll('-', '_');
const keycloak =
  process.env.IDENTITY_TEST_KEYCLOAK_URL ?? 'http://localhost:8081';
const mongo =
  process.env.IDENTITY_TEST_MONGO_URI ??
  'mongodb://admin:admin123@localhost:27017/?authSource=admin';
let masterToken, registry, service, gateway, http, testError, smtp;
const cleanupErrors = [];
async function cleanup(action) {
  try {
    await action();
  } catch (error) {
    cleanupErrors.push(error);
  }
}
const freePort = async () => {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const port = server.address().port;
  await new Promise((resolve) => server.close(resolve));
  return port;
};
async function master(url, method = 'GET', body) {
  const response = await fetch(`${keycloak}/admin/${url}`, {
    method,
    headers: {
      authorization: `Bearer ${masterToken}`,
      'content-type': 'application/json',
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(10000),
  });
  assert.ok(
    response.ok,
    `Keycloak fixture ${method} ${url}: HTTP ${response.status}`,
  );
  return response;
}
async function signIn(username, password) {
  const response = await fetch(
    `${keycloak}/realms/${realm}/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'pm-web',
        grant_type: 'password',
        username,
        password,
      }),
      signal: AbortSignal.timeout(5000),
    },
  );
  assert.equal(response.status, 200, 'Test-only user token issuance');
  return (await response.json()).access_token;
}
async function prepareLogin(userId) {
  await master(`realms/${realm}/users/${userId}`, 'PUT', {
    requiredActions: [],
    emailVerified: true,
  });
  await master(`realms/${realm}/users/${userId}/reset-password`, 'PUT', {
    type: 'password',
    value: 'Test-Only-Password!42',
    temporary: false,
  });
}
async function request(method, url, token, payload, status = 200) {
  const response = await http.inject({
    method,
    url,
    headers: token ? { authorization: `Bearer ${token}` } : {},
    ...(payload !== undefined ? { payload } : {}),
  });
  assert.equal(
    response.statusCode,
    status,
    `${method} ${url}: ${response.body}`,
  );
  return status === 204 ? undefined : response.json();
}
try {
  await verifyMongoRepository();
  const response = await fetch(
    `${keycloak}/realms/master/protocol/openid-connect/token`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: 'admin-cli',
        grant_type: 'password',
        username: process.env.IDENTITY_TEST_ADMIN ?? 'admin',
        password: process.env.IDENTITY_TEST_ADMIN_PASSWORD ?? 'admin',
      }),
      signal: AbortSignal.timeout(10000),
    },
  );
  assert.equal(response.status, 200, 'Keycloak test fixture admin login');
  masterToken = (await response.json()).access_token;
  const fixture = JSON.parse(
    readFileSync(path.join(appDir, 'fixtures/pm-realm.json'), 'utf8'),
  );
  fixture.realm = realm;
  fixture.clients.find(
    (c) => c.clientId === 'pm-web',
  ).directAccessGrantsEnabled = true; // Disposable realm only.
  fixture.users.push({
    username: 'test-admin',
    enabled: true,
    email: 'test-admin@example.invalid',
    firstName: 'Test',
    lastName: 'Admin',
    emailVerified: true,
    realmRoles: ['admin'],
    credentials: [
      { type: 'password', value: 'Test-Only-Password!42', temporary: false },
    ],
  });
  await master('realms', 'POST', fixture);
  const registryPort = await freePort();
  const tcpPort = await freePort();
  const healthPort = await freePort();
  registry = await createRegistryApp(
    { config: { port: registryPort, leaseTtlMs: 3000, bodyLimit: '64kb' } },
    false,
  );
  await registry.listen(registryPort, '127.0.0.1');
  Object.assign(process.env, {
    PORT: String(tcpPort),
    IDENTITY_HOST: '127.0.0.1',
    HEALTH_PORT: String(healthPort),
    HEALTH_HOST: '127.0.0.1',
    SERVICE_NAME: 'w-identity',
    RABBITMQ_URI:
      process.env.IDENTITY_TEST_RABBITMQ_URI ??
      'amqp://guest:guest@localhost:5672',
    RABBITMQ_QUEUE: realm,
    SERVICE_INSTANCE_ID: realm,
    SERVICE_ADVERTISE_HOST: '127.0.0.1',
    REGISTRY_URL: `http://127.0.0.1:${registryPort}`,
    MONGODB_URI: (() => {
      const uri = new URL(mongo);
      uri.pathname = '/' + database;
      return uri.toString();
    })(),
    KEYCLOAK_URL: keycloak,
    KEYCLOAK_REALM: realm,
    KEYCLOAK_ISSUER: `${keycloak}/realms/${realm}`,
    KEYCLOAK_CLIENT_ID: 'identity-service',
    KEYCLOAK_CLIENT_SECRET: 'dev-identity-secret',
  });
  const { AppModule } = require('../dist/app.module.js');
  service = await NestFactory.create(AppModule, {
    logger: false,
    abortOnError: false,
  });
  service.connectMicroservice({
    transport: Transport.TCP,
    options: { host: '127.0.0.1', port: tcpPort },
  });
  await service.init();
  await startRabbitMQ(service);
  await service.startAllMicroservices();
  gateway = await buildGateway({
    project: 'identity',
    auth: { issuer: `${keycloak}/realms/${realm}`, audience: 'w-identity' },
    specPath: path.join(gatewayDir, 'specs/identity/openapi.yml'),
    specsDir: path.join(gatewayDir, 'specs'),
    discovery: { url: `http://127.0.0.1:${registryPort}`, pollIntervalMs: 100 },
    rpcTimeoutMs: 10000,
    bodyLimit: 1048576,
    failoverMaxAttempts: 1,
    port: 0,
  });
  for (
    let i = 0;
    i < 100 && !(await gateway.discovery.resolve('identity.me.get')).length;
    i++
  )
    await new Promise((resolve) => setTimeout(resolve, 100));
  assert.equal(
    (await gateway.discovery.resolve('identity.me.get')).length,
    1,
    'Real service discovery registration',
  );
  http = await createGatewayApp(gateway);
  await http.init();
  const adminToken = await signIn('test-admin', 'Test-Only-Password!42');
  await request('GET', '/me', undefined, undefined, 401);
  await request('GET', '/me', 'invalid', undefined, 401);
  const account = await request(
    'POST',
    '/users',
    adminToken,
    {
      username: 'alice',
      email: 'alice@example.invalid',
      firstName: 'Alice',
      lastName: 'Test',
    },
    201,
  );
  assert.ok(account.roles.includes('user'));
  const id = account.userId;
  await request(
    'POST',
    '/users',
    adminToken,
    { username: 'alice', email: 'alice@example.invalid' },
    409,
  );
  await prepareLogin(id);
  const userToken = await signIn('alice', 'Test-Only-Password!42');
  const me = await request('GET', '/me', userToken);
  const rabbit = service.get(RabbitMQService);
  const claims = JSON.parse(
    Buffer.from(userToken.split('.')[1], 'base64url').toString(),
  );
  const rmqMe = await rabbit.send(realm, 'identity.me.get', {
    params: {},
    query: {},
    user: { ...claims, roles: ['user'] },
    meta: {
      requestId: randomUUID(),
      operationId: 'identity.me.get',
      project: 'identity',
    },
  });
  assert.equal(
    rmqMe.userId,
    id,
    'Existing identity handler also responds over RMQ',
  );
  await assert.rejects(
    rabbit.send(realm, 'identity.me.get', {
      params: {},
      query: {},
      meta: { requestId: randomUUID() },
    }),
    (error) => error.code === 'UNAUTHENTICATED',
  );
  assert.equal(me.userId, id);
  assert.equal(me.profile.userId, id);
  assert.ok(!('_id' in me.profile));
  await request('PATCH', '/me', userToken, {
    locale: 'vi',
    timezone: 'Asia/Ho_Chi_Minh',
  });
  await request(
    'PATCH',
    '/me',
    userToken,
    { userId: 'victim', locale: 'vi' },
    400,
  );
  assert.equal((await request('GET', '/me', userToken)).profile.locale, 'vi');
  await request('GET', '/users', userToken, undefined, 403);
  await request('PUT', `/users/${id}/roles/admin`, userToken, undefined, 403);
  const page = await request('GET', '/users?search=alice&limit=1', adminToken);
  assert.equal(page.items.length, 1);
  await request('GET', '/users?limit=101', adminToken, undefined, 400);
  await request(
    'PATCH',
    `/users/${id}`,
    adminToken,
    { email: 'alice-new@example.invalid' },
    204,
  );
  assert.equal(
    (await request('GET', `/users/${id}`, adminToken)).emailVerified,
    false,
  );
  await request(
    'PATCH',
    `/users/${id}`,
    adminToken,
    { username: 'other' },
    400,
  );
  const roles = await request('GET', '/roles', adminToken);
  assert.deepEqual(roles.items.sort(), ['admin', 'user']);
  await request('PUT', `/users/${id}/roles/admin`, adminToken, undefined, 204);
  assert.ok(
    (await request('GET', `/users/${id}`, adminToken)).roles.includes('admin'),
  );
  await request(
    'DELETE',
    `/users/${id}/roles/admin`,
    adminToken,
    undefined,
    204,
  );
  await request(
    'PUT',
    `/users/${id}/roles/realm-admin`,
    adminToken,
    undefined,
    400,
  );
  await request('GET', '/users/missing', adminToken, undefined, 404);
  // No SMTP is configured in this disposable realm. No real email is sent.
  await request(
    'POST',
    `/users/${id}/password-reset-email`,
    adminToken,
    undefined,
    503,
  );
  const messages = [];
  smtp = new SMTPServer({
    disabledCommands: ['AUTH', 'STARTTLS'],
    onData(stream, session, callback) {
      let raw = '';
      stream.on('data', (chunk) => {
        raw += chunk.toString();
      });
      stream.on('end', () => {
        messages.push({
          raw,
          recipients: session.envelope.rcptTo.map((r) => r.address),
        });
        callback();
      });
      stream.on('error', callback);
    },
  });
  const smtpPort = await freePort();
  await new Promise((resolve, reject) => {
    smtp.on('error', reject);
    smtp.listen(smtpPort, '0.0.0.0', resolve);
  });
  await master(`realms/${realm}`, 'PUT', {
    smtpServer: {
      host: process.env.IDENTITY_TEST_SMTP_HOST ?? 'host.docker.internal',
      port: String(smtpPort),
      from: 'identity-tests@example.invalid',
      ssl: 'false',
      starttls: 'false',
      auth: 'false',
    },
  });
  await request(
    'POST',
    `/users/${id}/password-reset-email`,
    adminToken,
    undefined,
    204,
  );
  assert.equal(
    messages.length,
    1,
    'Local SMTP received one password action email',
  );
  assert.deepEqual(messages[0].recipients, ['alice-new@example.invalid']);
  assert.ok(
    messages[0].raw.includes('action-token'),
    'Email contains a Keycloak action link',
  );
  await request(
    'PATCH',
    `/users/${id}/status`,
    adminToken,
    { enabled: false },
    204,
  );
  await request('GET', '/me', userToken, undefined, 403);
  assert.equal(
    (await request('GET', `/users/${id}`, adminToken)).enabled,
    false,
  );
  assert.deepEqual(
    await (await master(`realms/${realm}/users/${id}/sessions`)).json(),
    [],
  );
  await request(
    'PATCH',
    `/users/${id}/status`,
    adminToken,
    { enabled: true },
    204,
  );
  const health = await fetch(`http://127.0.0.1:${healthPort}/health/ready`);
  assert.equal(health.status, 200);
  const connection = service.get(getConnectionToken());
  await connection.close();
  await request('GET', '/me', userToken, undefined, 503);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(
    (await fetch(`http://127.0.0.1:${healthPort}/health/ready`)).status,
    503,
  );
  console.log(
    'PASS E2E: verified JWT → HTTP gateway → real registry → TCP → Keycloak/MongoDB; admin/user permissions, CRUD, roles, profile, SMTP failure/success captured locally, disable/session and storage failure',
  );
} catch (error) {
  testError = error;
} finally {
  if (http) await cleanup(() => http.close());
  if (gateway) {
    gateway.discovery.close();
    await cleanup(() => gateway.transport.close());
  }
  if (service) await cleanup(() => service.close());
  if (process.env.RABBITMQ_QUEUE === realm)
    await cleanup(async () => {
      const broker = await amqp.connect(process.env.RABBITMQ_URI);
      try {
        const channel = await broker.createChannel();
        try {
          await channel.deleteQueue(realm);
          await channel.deleteQueue(`${realm}.dlq`);
          await channel.deleteExchange(`${realm}.dlx`);
        } finally {
          await channel.close();
        }
      } finally {
        await broker.close();
      }
    });
  if (registry) await cleanup(() => registry.close());
  if (smtp) await cleanup(() => new Promise((resolve) => smtp.close(resolve)));
  if (masterToken)
    await cleanup(async () => {
      const result = await fetch(`${keycloak}/admin/realms/${realm}`, {
        method: 'DELETE',
        headers: { authorization: `Bearer ${masterToken}` },
      });
      assert.ok([204, 404].includes(result.status), 'Clean disposable realm');
    });
  await cleanup(async () => {
    const connection = await createConnection(mongo, {
      dbName: database,
      serverSelectionTimeoutMS: 2000,
    }).asPromise();
    try {
      await connection.dropDatabase();
    } finally {
      await connection.close();
    }
  });
}
if (testError) throw testError;
assert.equal(cleanupErrors.length, 0, 'Disposable resources were cleaned');
