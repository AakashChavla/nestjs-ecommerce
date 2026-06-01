import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { NotFoundException } from 'src/common/exceptions';
import { UserRepository } from '../user/user.repository';
import { DEFAULT_TOKEN_EXPIRY } from './constants/auth.constants';
import { LoginDto } from './dto/login.dto';
import { JwtAccessPayload, JwtRefreshPayload } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private userRepository: UserRepository,
    private i18nService: I18nService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.userRepository.findByEmail(email);

    if (!user) {
      throw new NotFoundException(
        this.i18nService.t('common.user_not_found'),
        'USER_NOT_FOUND',
      );
    }

    const isPasswordMatched = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatched) {
      throw new UnauthorizedException(
        this.i18nService.t('user.auth.invalid_credential'),
      );
    }

    await this.userRepository.updateLastLogin(user.id);

    const accessTokenPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };
    const refreshTokenPayload: JwtRefreshPayload = {
      sub: user.id,
      version: user.tokenVersion,
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET_TOKEN'),
      expiresIn:
        this.configService.get('JWT_ACCESS_EXPIRES_IN') ||
        DEFAULT_TOKEN_EXPIRY.ACCESS,
    });

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET_TOKEN'),
      expiresIn:
        this.configService.get('JWT_REFRESH_EXPIRES_IN') ||
        DEFAULT_TOKEN_EXPIRY.REFRESH,
    });

    return {
      message: this.i18nService.t('user.auth.login_success'),
      data: { id: user.id, refreshToken, accessToken, role: user.role },
    };
  }

  async logout(userId: string) {
    // Invalidate all tokens by incrementing the tokenVersion
    const updatedUser = await this.userRepository.incrementTokenVersion(userId);

    return {
      message: this.i18nService.t('user.auth.logout_success'),
      data: { tokenVersion: updatedUser.tokenVersion },
    };
  }

  async refreshAccessToken(userId: string, tokenVersion: number) {
    // Verify user exists and token version matches
    const user = await this.userRepository.findById(userId);

    if (!user || user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException(
        this.i18nService.t('user.verification.invalid_token'),
      );
    }

    // Generate new access token
    const accessTokenPayload: JwtAccessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET_TOKEN'),
      expiresIn:
        this.configService.get('JWT_ACCESS_EXPIRES_IN') ||
        DEFAULT_TOKEN_EXPIRY.ACCESS,
    });

    return {
      message: this.i18nService.t('user.auth.token_refreshed'),
      data: { accessToken },
    };
  }

  async getMyProfile(userId: string) {
    const user = await this.userRepository.findByIdWithSelect(userId, {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    });

    if (!user) {
      throw new NotFoundException(
        this.i18nService.t('common.user_not_found'),
        'USER_NOT_FOUND',
      );
    }

    return {
      message: this.i18nService.t('user.profile.retrieved_success'),
      data: user,
    };
  }
}
