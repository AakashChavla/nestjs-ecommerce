import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { DatabaseService } from 'src/common';
import { MailService } from 'src/common/mail/mail.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private databaseService: DatabaseService,
    private mailService: MailService,
    private i18nService: I18nService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async verifyEmail(token: string) {
    try {
      // Verify and decode the token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>(
          'JWT_VERIFICATION_SECRET_TOKEN',
        ),
      });

      // Check if token type is correct
      if (payload.type !== 'email-verification') {
        throw new BadRequestException(
          this.i18nService.t('user.verification.invalid_token'),
        );
      }

      // Find the user
      const user = await this.databaseService.user.findUnique({
        where: { id: payload.userId },
      });

      if (!user) {
        throw new BadRequestException(
          this.i18nService.t('user.verification.user_not_found'),
        );
      }

      // Check if email is already verified
      if (user.emailVerified) {
        return {
          message: this.i18nService.t('user.verification.already_verified'),
          data: { emailVerified: true },
        };
      }

      // Update user to mark email as verified
      await this.databaseService.user.update({
        where: { id: user.id },
        data: {
          emailVerified: true,
        },
      });

      const name = user.name ?? user.email;
      await this.mailService.sendVerifiedSuccessMail(user.email, name);
      return {
        message: this.i18nService.t('user.verification.success'),
        data: { emailVerified: true },
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException(
          this.i18nService.t('user.verification.token_expired'),
        );
      }
      if (error.name === 'JsonWebTokenError') {
        throw new BadRequestException(
          this.i18nService.t('user.verification.invalid_token'),
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const { email, password } = dto;
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(this.i18nService.t('common.user_not_found'));
    }

    const isPasswordMatched = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatched) {
      throw new UnauthorizedException(
        this.i18nService.t('user.auth.invalid_credential'),
      );
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const accessTokenPayload = {
      sub: user.id,
      role: user.role,
    };
    const refreshTokenPayload = {
      sub: user.id,
      version: user.tokenVersion,
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET_TOKEN'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    const refreshToken = await this.jwtService.signAsync(refreshTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET_TOKEN'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    return {
      message: this.i18nService.t('user.auth.login_success'),
      data: { id: user.id, refreshToken, accessToken, role: user.role },
    };
  }

  async logout(userId: string) {
    // Invalidate all tokens by incrementing the tokenVersion
    const updatedUser = await this.databaseService.user.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });

    return {
      message: this.i18nService.t('user.auth.logout_success'),
      data: { tokenVersion: updatedUser.tokenVersion },
    };
  }

  async refreshAccessToken(userId: string, tokenVersion: number) {
    // Verify user exists and token version matches
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.tokenVersion !== tokenVersion) {
      throw new UnauthorizedException(
        this.i18nService.t('user.verification.invalid_token'),
      );
    }

    // Generate new access token
    const accessTokenPayload = {
      sub: user.id,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(accessTokenPayload, {
      secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET_TOKEN'),
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRES_IN') || '15m',
    });

    return {
      message: this.i18nService.t('user.auth.token_refreshed'),
      data: { accessToken },
    };
  }

  async getMyProfile(userId: string) {
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(this.i18nService.t('common.user_not_found'));
    }

    return {
      message: this.i18nService.t('user.profile.retrieved_success'),
      data: user,
    };
  }
}
