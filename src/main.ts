// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { I18nValidationPipe } from 'nestjs-i18n';
import { MorganConfig } from './common/config/morgan/morgan.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Configure Morgan HTTP request logging
  app.use(MorganConfig.getMiddleware());

  // Optional: Add security-focused logging for authentication routes
  app.use(MorganConfig.getSecurityConfig());

  // Global prefix (optional)
  app.setGlobalPrefix('api/v1');

  // Enable CORS with explicit configuration
  app.enableCors({
    origin: true, // Allow all origins in development
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
      .setTitle('SecureAudit API')
      .setDescription('API documentation for SecureAudit Project')
      .setVersion('1.0.0')
      .addBearerAuth() // Simple default bearer auth
      .build();

    const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'Secure Audit API Docs',
    });
  }

  const port = process.env.PORT || 8080;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger is running on: http://localhost:${port}/api/docs`);
}
bootstrap();
