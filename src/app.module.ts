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
import { IDENTITY_PROVIDER, USER_REPOSITORY } from './bootstrap/tokens';
import { UserRepository } from './infrastructure/persistence/mongoose/user.repository';
import { KeycloakIdentityAdapter } from './infrastructure/keycloak/keycloak-identity.adapter';
import { AuthorizationPolicy } from './application/security/authorization.policy';
import { IdentityCqrsHandlers } from './presentation/cqrs/identity.handlers';
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
    DatabaseModule.forFeature([UserRepository]),
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
  controllers: [IdentityController],
  providers: [
    {
      provide: USER_REPOSITORY,
      useExisting: UserRepository,
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
  ],
})
export class AppModule {}
