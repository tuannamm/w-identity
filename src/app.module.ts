import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
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
      inject: [getConnectionToken(), RabbitMQService],
      useFactory: (connection: Connection, rabbit: RabbitMQService) => ({
        indicators: [
          {
            name: 'mongodb',
            probes: ['ready'],
            check: async () => ({
              status: connection.readyState === 1 ? 'up' : 'down',
            }),
          },
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
