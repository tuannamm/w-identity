import { AccessResolver } from './application/security/access-resolver';
import { AuthzController } from './presentation/tcp/authz.controller';
import { CqrsModule } from '@nestjs/cqrs';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  DatabaseModule,
  createDatabaseIndicator,
  getDatabaseConnectionToken,
  type DatabaseConnection,
} from '@lib-infrastructure/database';
import { HealthModule, ServiceDiscoveryModule } from '@lib-infrastructure/core';
import { RabbitMQModule, RabbitMQService } from '@lib-infrastructure/rabbitmq';
import {
  KeycloakModule,
  KeycloakHttpClient,
} from '@lib-infrastructure/keycloak';
import {
  DEFAULT_USER_PASSWORD,
  IDENTITY_PROVIDER,
  PERMISSION_REPOSITORY,
  ROLE_REPOSITORY,
  USER_REPOSITORY,
  USER_ROLE_REPOSITORY,
} from './bootstrap/tokens';
import { RbacSeeder } from './bootstrap/rbac.seeder';
import { UserRepository } from './infrastructure/persistence/mongoose/user/user.repository';
import { PermissionRepository } from './infrastructure/persistence/mongoose/permission/permission.repository';
import { RoleRepository } from './infrastructure/persistence/mongoose/role/role.repository';
import { UserRoleRepository } from './infrastructure/persistence/mongoose/user/user-role.repository';
import { KeycloakIdentityAdapter } from './infrastructure/keycloak/keycloak-identity.adapter';
import { AuthorizationPolicy } from './application/security/authorization.policy';
import { IdentityCqrsHandlers } from './presentation/cqrs/identity.handlers';
import { RbacCqrsHandlers } from './presentation/cqrs/rbac.handlers';
import { PermissionController } from './presentation/tcp/permission.controller';
import { RoleController } from './presentation/tcp/role.controller';
import { IdentityController } from './presentation/tcp/identity.controller';
const rabbitMQ = RabbitMQModule.forRoot();
@Module({
  imports: [
    CqrsModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
    }),
    DatabaseModule,
    DatabaseModule.forFeature([
      UserRepository,
      PermissionRepository,
      RoleRepository,
      UserRoleRepository,
    ]),
    KeycloakModule,
    rabbitMQ,
    ServiceDiscoveryModule.forRoot(),
    HealthModule.forRootAsync({
      imports: [DatabaseModule, rabbitMQ],
      inject: [getDatabaseConnectionToken(), RabbitMQService],
      useFactory: (
        connection: DatabaseConnection,
        rabbit: RabbitMQService,
      ) => ({
        indicators: [
          createDatabaseIndicator(connection),
          {
            name: 'rabbitmq',
            probes: ['ready'],
            check: async () => ({ status: rabbit.isReady ? 'up' : 'down' }),
          },
        ],
      }),
    }),
  ],
  controllers: [
    IdentityController,
    PermissionController,
    RoleController,
    AuthzController,
  ],
  providers: [
    {
      provide: DEFAULT_USER_PASSWORD,
      inject: [ConfigService],
      // Dev default. Keycloak makes it temporary, but anyone who knows it can
      // log in before the user does: override it outside development.
      useFactory: (config: ConfigService) =>
        config.get<string>('DEFAULT_USER_PASSWORD') || '123',
    },
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
    },
    { provide: PERMISSION_REPOSITORY, useExisting: PermissionRepository },
    { provide: ROLE_REPOSITORY, useExisting: RoleRepository },
    { provide: USER_ROLE_REPOSITORY, useExisting: UserRoleRepository },
    RbacSeeder,
    {
      provide: AccessResolver,
      inject: [IDENTITY_PROVIDER, ROLE_REPOSITORY, USER_ROLE_REPOSITORY],
      useFactory: (identity, roles, userRoles) =>
        new AccessResolver(identity, roles, userRoles),
    },
    {
      provide: IDENTITY_PROVIDER,
      inject: [KeycloakHttpClient],
      useFactory: (client: KeycloakHttpClient) =>
        new KeycloakIdentityAdapter(client),
    },
    {
      provide: AuthorizationPolicy,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AuthorizationPolicy(config.get<string>('KEYCLOAK_ISSUER', '')),
    },
    ...IdentityCqrsHandlers,
    ...RbacCqrsHandlers,
  ],
})
export class AppModule {}
