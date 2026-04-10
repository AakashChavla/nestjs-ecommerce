import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { I18nService } from 'nestjs-i18n';

@Injectable()
export class JwtRefreshGuard extends AuthGuard('JWT-refresh-token') {
  constructor(
    private reflector: Reflector,
    private i18nService: I18nService,
  ) {
    super();
  }

  handleRequest<TUser = unknown>(err: Error | null, user: TUser | null): TUser {
    if (err || !user) {
      throw (
        err ||
        new UnauthorizedException(
          this.i18nService.t('user.verification.invalid_token'),
        )
      );
    }
    return user;
  }
}
