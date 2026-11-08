import { Module } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import type { Connection } from 'mongoose';
import { HealthModule } from '@org/health';
import { ServiceDiscoveryModule } from '@org/service-discovery-client';
import { IdentityModule } from './bootstrap/identity.module';
@Module({
  imports: [
    IdentityModule,
    ServiceDiscoveryModule.forRoot(),
    HealthModule.forRootAsync({
      imports: [IdentityModule],
      inject: [getConnectionToken()],
      useFactory: (connection: Connection) => ({
        indicators: [
          {
            name: 'mongodb',
            probes: ['ready'],
            check: async () => ({
              status: connection.readyState === 1 ? 'up' : 'down',
            }),
          },
        ],
      }),
    }),
  ],
})
export class AppModule {}
