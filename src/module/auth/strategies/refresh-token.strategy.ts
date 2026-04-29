import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from 'src/module/user/user.repository';
import { AuthenticatedUser, JwtRefreshPayload } from '../types/auth.types';

export const jwtExtractor = (req: Request): string | null => {
  if (!req) return null;

  let token: string | null = null;

  // 1️⃣ Try cookie
  if (req.cookies?.refresh_token) {
    token = req.cookies.refresh_token;
  }

  // 2️⃣ Fallback to Authorization header
  if (!token) {
    const headerToken = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    if (headerToken && headerToken !== 'null' && headerToken !== 'undefined') {
      token = headerToken;
    }
  }

  return token || null;
};

@Injectable()
export class JWTRefreshToken extends PassportStrategy(
  Strategy,
  'JWT-refresh-token',
) {
  constructor(
    private configService: ConfigService,
    private userRepository: UserRepository,
    private i18nService: I18nService,
  ) {
    super({
      jwtFromRequest: jwtExtractor,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET_TOKEN'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: JwtRefreshPayload): Promise<AuthenticatedUser> {
    const user = await this.userRepository.findById(payload.sub);
    if (!user || user.tokenVersion !== payload.version) {
      throw new UnauthorizedException(
        this.i18nService.t('user.verification.invalid_token'),
      );
    }
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
      tokenVersion: user.tokenVersion,
    };
  }
}
