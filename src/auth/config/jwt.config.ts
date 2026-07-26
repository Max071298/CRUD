import { registerAs } from '@nestjs/config';
import { JwtModuleOptions, JwtSignOptions } from '@nestjs/jwt';

export default registerAs('jwt', (): JwtModuleOptions => ({
  secret: process.env.JWT_SECRET_KEY,
  signOptions: {
    expiresIn: process.env.TOKEN_EXPIRE_TIME,
  } as JwtSignOptions,
}));
