import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { DatabaseService } from 'src/common';

export interface Payload {
  sub: string;
  version: number;
  iat?: number;
  exp?: number;
}

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
    private databaseService: DatabaseService,
    private i18nService: I18nService,
  ) {
    super({
      jwtFromRequest: jwtExtractor,
      secretOrKey: configService.getOrThrow<string>('JWT_REFRESH_SECRET_TOKEN'),
      ignoreExpiration: false,
    });
  }

  async validate(payload: Payload) {
    const user = await this.databaseService.user.findUnique({
      where: { id: payload.sub },
    });
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
