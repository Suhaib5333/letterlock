import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  configureApp(app);

  const config = new DocumentBuilder()
    .setTitle('Letterlock API')
    .setDescription('Custom backend for Letterlock (auth, profiles, leaderboard, friends, saves, realtime).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));

  const port = Number(process.env.PORT || 3100);
  // Production binds to loopback: Traefik on the same box is the only client.
  const host = process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0';
  await app.listen(port, host);
  new Logger('Bootstrap').log(`Letterlock API listening on http://${host}:${port} (docs at /docs)`);
}
void bootstrap();
