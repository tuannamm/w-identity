import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { NestFactory } from '@nestjs/core';
import { Transport, type MicroserviceOptions } from '@nestjs/microservices';
import { AppModule } from './app.module';
import { loadIdentityConfig } from './bootstrap/config/identity.config';
async function bootstrap() {
  const file = join(__dirname, '..', '.env');
  if (existsSync(file)) process.loadEnvFile(file);
  let config: ReturnType<typeof loadIdentityConfig>;
  try {
    config = loadIdentityConfig();
  } catch (error) {
    // Configuration errors contain variable names only, never values or secrets.
    console.error(`Invalid identity configuration: ${(error as Error).message}`);
    process.exitCode = 1;
    return;
  }
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: { host: config.host, port: config.port },
    },
  );
  app.enableShutdownHooks();
  await app.listen();
}
void bootstrap().catch(() => {
  console.error(
    'Identity startup failed; check configuration and dependency availability',
  );
  process.exitCode = 1;
});
