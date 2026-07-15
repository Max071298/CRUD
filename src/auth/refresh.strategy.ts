import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RefreshJwtStrategy extends PassportStrategy(
  Strategy,
  'refresh-jwt',
) {
  constructor(protected configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        (configService.get('JWT_SECRET_REFRESH_KEY') as string) ||
        '5k9Xq2sF6vHq1JRt5X2N9hgrYpIdt8iBSjJVwETIFVw', //fix later
    });
  }

  async validate(payload: any) {
    return { userId: payload.sub, login: payload.login };
  }
}
