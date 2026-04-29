import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { CommonModule } from 'src/common/common.module';
import { UserModule } from '../user/user.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

// Strategies
import { JwtStrategy } from './strategies/access-token.strategy';
import { JWTRefreshToken } from './strategies/refresh-token.strategy';

// Guards
import { JwtAuthGuard } from './guards/access-token.guard';
import { JwtRefreshGuard } from './guards/refresh-token.guard';
import { RoleGuard } from './guards/role.guard';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_ACCESS_SECRET_TOKEN'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRES_IN') || '7d',
        },
      }),
      inject: [ConfigService],
      global: true,
    }),
    CommonModule,
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    // Strategies
    JwtStrategy,
    JWTRefreshToken,
    // Guards
    JwtAuthGuard,
    JwtRefreshGuard,
    RoleGuard,
  ],
  exports: [
    AuthService,
    JwtAuthGuard,
    JwtRefreshGuard,
    RoleGuard,
    JwtStrategy,
    JWTRefreshToken,
  ],
})
export class AuthModule {}
