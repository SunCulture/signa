import { INestApplication, Logger } from '@nestjs/common';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { I18nValidationPipe } from 'nestjs-i18n';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { httpObservabilityMiddleware } from './common/middleware/http-observability.middleware';
import { requestIdMiddleware } from './common/middleware/request-id.middleware';
import { RuntimeObservabilityService } from './health/runtime-observability.service';

async function bootstrap() {
  const logger = new Logger(bootstrap.name, { timestamp: true });
  const app = await NestFactory.create(AppModule);

  configureApp(app);
  setupSwagger(app);

  const port = Number(process.env.PORT ?? 3001);
  const host = process.env.HOSTNAME ?? '0.0.0.0';

  // Bind explicitly so Docker and production runtimes publish the API outside
  // the container instead of relying on platform-specific loopback defaults.
  await app.listen(port, host);
  logger.log(`Server is running on: ${await app.getUrl()}`);
}

function configureApp(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.use(requestIdMiddleware());
  app.use(httpObservabilityMiddleware(app.get(RuntimeObservabilityService)));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
  app.use(helmet());
  app.use(cookieParser());
  app.use(compression());
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.FRONTEND_ORIGIN ?? 'http://localhost:3000',
  });
  app.enableShutdownHooks();
}

function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Signa API')
    .setDescription('DocuSeal-compatible signing API')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'X-Auth-Token',
        in: 'header',
      },
      'X-Auth-Token',
    )
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, documentFactory);
}

void bootstrap();
