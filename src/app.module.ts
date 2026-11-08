import { Module } from '@nestjs/common';
import {
  createDatabaseIndicator,
  getDatabaseConnectionToken,
  type DatabaseConnection,
} from '@lib-infrastructure/database';
import { HealthModule, ServiceDiscoveryModule } from '@lib-infrastructure/core';
import { RabbitMQModule, RabbitMQService } from '@lib-infrastructure/rabbitmq';
import { IdentityModule } from './bootstrap/identity.module';
const rabbitMQ = RabbitMQModule.forRoot();
@Module({
  imports: [
    IdentityModule,
    rabbitMQ,
    ServiceDiscoveryModule.forRoot(),
    HealthModule.forRootAsync({
      imports: [IdentityModule, rabbitMQ],
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
})
export class AppModule {}
