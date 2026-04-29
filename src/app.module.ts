import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';
import {
  AcceptLanguageResolver,
  HeaderResolver,
  I18nModule,
  QueryResolver,
} from 'nestjs-i18n';
import * as path from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CommonModule } from './common/common.module';
import { AddressModule } from './module/address/address.module';
import { AuthModule } from './module/auth/auth.module';
import { UserModule } from './module/user/user.module';

@Module({
  imports: [
    // STATIC FILES
    ServeStaticModule.forRoot({
      rootPath: path.join(__dirname, '..', '..', 'static'),
      serveRoot: '/static',
    }),

    // ENV
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: './.env',
      validationSchema: Joi.object({
        // Core
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(8080),
        APP_URL: Joi.string().required(),
        ENABLE_SWAGGER: Joi.string().valid('true', 'false').default('false'),
        FALLBACK_LANGUAGE: Joi.string().default('en'),
        CORS_ORIGINS: Joi.string().default('http://localhost:3000'),

        // Database
        DATABASE_URL: Joi.string().required().messages({
          'any.required': 'DATABASE_URL is required',
        }),

        // JWT
        JWT_ACCESS_SECRET_TOKEN: Joi.string().required().messages({
          'any.required': 'JWT_ACCESS_SECRET_TOKEN is required',
        }),
        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
        JWT_REFRESH_SECRET_TOKEN: Joi.string().required().messages({
          'any.required': 'JWT_REFRESH_SECRET_TOKEN is required',
        }),
        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),
        JWT_VERIFICATION_SECRET_TOKEN: Joi.string().required().messages({
          'any.required': 'JWT_VERIFICATION_SECRET_TOKEN is required',
        }),

        // Rate Limiting
        RATE_LIMIT_TTL: Joi.number().default(60),
        RATE_LIMIT_LIMIT: Joi.number().default(100),

        // SMTP
        SMTP_HOST: Joi.string().required().messages({
          'any.required': 'SMTP_HOST is required',
        }),
        SMTP_PORT: Joi.number().default(587),
        SMTP_SECURE: Joi.string().valid('true', 'false').default('false'),
        SMTP_USER: Joi.string().required().messages({
          'any.required': 'SMTP_USER is required',
        }),
        SMTP_PASS: Joi.string().required().messages({
          'any.required': 'SMTP_PASS is required',
        }),
        MAIL_FROM_NAME: Joi.string().default('E-Commerce API'),

        // Google Maps
        GOOGLE_MAPS_API_KEY: Joi.string().required().messages({
          'any.required': 'GOOGLE_MAPS_API_KEY is required',
        }),
        GOOGLE_MAPS_GEOCODING_BASE_URL: Joi.string().default(
          'https://maps.googleapis.com/maps/api/geocode/json',
        ),

        // Morgan/HTTP Logging
        ENABLE_HTTP_LOGGING: Joi.string()
          .valid('true', 'false')
          .default('true'),
        HTTP_LOG_FORMAT: Joi.string().default('auto'),
        LOG_ERRORS_ONLY: Joi.string().valid('true', 'false').default('false'),
        ENABLE_SECURITY_LOGGING: Joi.string()
          .valid('true', 'false')
          .default('true'),
        HTTP_LOG_FILE_PATH: Joi.string().optional(),
      }),
      validationOptions: {
        abortEarly: false,
        allowUnknown: true,
      },
    }),

    // RATE LIMIT
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get('RATE_LIMIT_TTL')) || 60,
            limit: Number(config.get('RATE_LIMIT_LIMIT')) || 100,
          },
        ],
      }),
    }),

    // I18N
    I18nModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        fallbackLanguage: configService.get<string>('FALLBACK_LANGUAGE', 'en'),
        loaderOptions: {
          path: path.join(__dirname, '..', 'common', 'i18n'),
          watch: configService.get('NODE_ENV') !== 'production',
        },
      }),
      resolvers: [
        { use: QueryResolver, options: ['lang'] },
        AcceptLanguageResolver,
        new HeaderResolver(['x-lang']),
      ],
    }),

    CommonModule,
    UserModule,
    AuthModule,
    AddressModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
