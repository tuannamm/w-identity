import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { startRabbitMQ } from '@lib-infrastructure/rabbitmq';
import { AppModule } from './app.module';
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { abortOnError: false });
  app.enableShutdownHooks();
  try {
    const config = app.get(ConfigService);
    app.connectMicroservice<MicroserviceOptions>({
      transport: Transport.TCP,
      options: {
        host: config.get<string>('IDENTITY_HOST', '127.0.0.1'),
        port: Number(config.get<string>('PORT', '4002')),
      },
    });
    await app.init();
    await startRabbitMQ(app);
    await app.startAllMicroservices();
  } catch (error) {
    await app.close();
    throw error;
  }
}
void bootstrap().catch(() => {
  console.error(
    'Identity startup failed; check configuration and dependency availability',
  );
  process.exitCode = 1;
});
