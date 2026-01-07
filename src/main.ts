import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    cors: {
      origin: true,
      credentials: true,
    },
  });

  const PORT = process.env.PORT || 3000;
  await app.listen(PORT, '0.0.0.0', () =>
    new Logger('bootstrap').log(`Server started: http://localhost:${PORT}`),
  );
}
bootstrap();
