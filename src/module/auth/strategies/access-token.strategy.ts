import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { I18nService } from 'nestjs-i18n';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserRepository } from 'src/module/user/user.repository';
import { AuthenticatedUser, JwtAccessPayload } from '../types/auth.types';

export const accessTokenExtractor = (req: Request): string | null => {
  if (!req) return null;

  let token: string | null = null;

  // 1️⃣ Try cookie
  if (req.cookies?.access_token) {
    token = req.cookies.access_token;
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
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private configService: ConfigService,
    private userRepository: UserRepository,
    private i18nService: I18nService,
  ) {
    super({
      jwtFromRequest: accessTokenExtractor,
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_ACCESS_SECRET_TOKEN'),
    });
  }

  async validate(payload: JwtAccessPayload): Promise<AuthenticatedUser> {
    // This payload comes from the decoded JWT
    const user = await this.userRepository.findById(payload.sub);

    if (!user) {
      throw new UnauthorizedException(
        this.i18nService.t('user.verification.invalid_token'),
      );
    }

    // This will be attached to request.user
    return {
      userId: user.id,
      email: user.email,
      role: user.role,
    };
  }
}
