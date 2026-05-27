// src/main.ts
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { I18nValidationPipe } from 'nestjs-i18n';
import { AppModule } from './app.module';
import { MorganConfig } from './common/config/morgan/morgan.config';
import { HttpExceptionFilter } from './common/helpers/filters/http-exception.filter';
import { ResponseInterceptor } from './common/helpers/interceptors/response.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Configure Morgan HTTP request logging
  app.use(MorganConfig.getMiddleware());

  // Optional: Add security-focused logging for authentication routes
  app.use(MorganConfig.getSecurityConfig());

  // Global prefix (optional)
  app.setGlobalPrefix('api/v1');

  // Enable CORS with allowlist from env
  const allowedOrigins = (process.env.CORS_ORIGINS ?? '*')
    .split(',')
    .map((o) => o.trim());

  app.enableCors({
    origin: allowedOrigins.includes('*') ? true : allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-lang', 'Accept'],
  });

  // Global validation pipe with i18n support
  app.useGlobalPipes(
    new I18nValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global response interceptor
  app.useGlobalInterceptors(new ResponseInterceptor());

  // Global exception filter (handles all exceptions including validation)
  app.useGlobalFilters(new HttpExceptionFilter());

  // Enable Swagger only for non-production OR explicitly enabled
  if (process.env.ENABLE_SWAGGER === 'true') {
    const config = new DocumentBuilder()
      .setTitle('E-Commerce API')
      .setDescription('API documentation for E-Commerce Project')
      .setVersion('1.0.0')
      .addBearerAuth() // Simple default bearer auth
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'E-Commerce API Docs',
    });
  }

  const port = process.env.PORT || 8080;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Swagger is running on: http://localhost:${port}/api/docs`);
}
bootstrap();
