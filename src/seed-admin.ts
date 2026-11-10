/**
 * One-off script: creates the bootstrap admin (Keycloak user + MongoDB role).
 *   npm run seed:admin   (reads SEED_ADMIN_USERNAME / _EMAIL / _PASSWORD from .env)
 * Idempotent. Loads only what it needs: no TCP server, RabbitMQ, discovery or health.
 */
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DatabaseModule } from '@lib-infrastructure/database';
import {
  KeycloakHttpClient,
  KeycloakModule,
} from '@lib-infrastructure/keycloak';
import {
  IDENTITY_PROVIDER,
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from './bootstrap/tokens';
import { AdminSeeder, readAdminSeedSettings } from './bootstrap/admin.seeder';
import { RbacSeeder } from './bootstrap/rbac.seeder';
import { KeycloakIdentityAdapter } from './infrastructure/keycloak/keycloak-identity.adapter';
import { PermissionRepository } from './infrastructure/persistence/mongoose/permission/permission.repository';
import { RoleRepository } from './infrastructure/persistence/mongoose/role/role.repository';
import { UserRoleRepository } from './infrastructure/persistence/mongoose/user/user-role.repository';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    DatabaseModule.forFeature([
      PermissionRepository,
      RoleRepository,
      UserRoleRepository,
    ]),
    KeycloakModule,
  ],
  providers: [
    { provide: PERMISSION_REPOSITORY, useExisting: PermissionRepository },
    { provide: ROLE_REPOSITORY, useExisting: RoleRepository },
    { provide: USER_ROLE_REPOSITORY, useExisting: UserRoleRepository },
    {
      provide: IDENTITY_PROVIDER,
      inject: [KeycloakHttpClient],
      useFactory: (client: KeycloakHttpClient) =>
        new KeycloakIdentityAdapter(client),
    },
    RbacSeeder,
    AdminSeeder,
  ],
})
class SeedAdminModule {}

async function main(): Promise<void> {
  const app = await NestFactory.createApplicationContext(SeedAdminModule, {
    abortOnError: false,
    logger: ['error', 'warn'],
  });
  try {
    const config = app.get(ConfigService);
    const settings = readAdminSeedSettings((key) => config.get<string>(key));
    if (settings.status === 'missing')
      throw new Error('SEED_ADMIN_USERNAME is not set');
    if (settings.status === 'invalid') throw new Error(settings.problem);
    // init() runs onModuleInit (models/indexes) and RbacSeeder, so the admin role exists.
    await app.init();
    const { userId, created } = await app
      .get(AdminSeeder)
      .seed(settings.config);
    console.log(
      created
        ? `Admin "${settings.config.username}" created (id ${userId}) with a temporary password; it must be changed at first login.`
        : `Admin "${settings.config.username}" already exists (id ${userId}); password left untouched.`,
    );
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  // Only our own messages are printed: adapters already sanitize upstream errors.
  console.error(
    `seed:admin failed: ${error instanceof Error ? error.message : 'unknown error'}`,
  );
  process.exitCode = 1;
});
