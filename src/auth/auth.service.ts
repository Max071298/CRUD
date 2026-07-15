import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { CreateUser, Payload, SignInUser } from 'src/common/interfaces';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(login: string, pass: string) {
    const user = await this.usersService.findByLogin(login);

    if (user && user.password === pass) {
      const { password, ...result } = user;
      return result;
    }

    return null;
  }

  async generateTokens(payload: Payload) {
    return {
      access_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET_KEY'),
        expiresIn: this.configService.get('TOKEN_EXPIRE_TIME'),
      }),
      refresh_token: this.jwtService.sign(payload, {
        secret: this.configService.get('JWT_SECRET_REFRESH_KEY'),
        expiresIn: this.configService.get('TOKEN_REFRESH_EXPIRE_TIME'),
      }),
    };
  }

  async register(user: CreateUser) {
    const isExistingUser =
      (await this.usersService.findByEmail(user.email)) ||
      (await this.usersService.findByLogin(user.login));

    if (isExistingUser)
      throw new ConflictException(
        'User with such email or/and login is already exists',
      );

    const newUser = await this.usersService.createUser(user);
    const payload: Payload = { sub: newUser.userId, login: newUser.login };

    return await this.generateTokens(payload);
  }

  async signIn(userData: SignInUser) {
    const { login, password } = userData;
    const user = await this.validateUser(login, password);

    if (!user) throw new UnauthorizedException('Incorrect login or password');

    const payload: Payload = { sub: user.userId, login: user.login };

    return await this.generateTokens(payload);
  }

  async refreshTokens(userId: string, login: string) {
    const payload: Payload = { sub: userId, login };
    return await this.generateTokens(payload);
  }
}
