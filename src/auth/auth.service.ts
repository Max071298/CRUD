import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { checkPassword } from 'src/common/checkPassword';
import { hashPassword } from 'src/common/hashPassword';
import { ICreateUser, IPayload, ISignInUser } from 'src/common/interfaces';
import { UsersService } from 'src/users/users.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(login: string, pass: string) {
    this.logger.log(`Starting user validation with login ${login}...`);

    try {
      const user = await this.usersService.findByLogin(login);

      if (user && (await checkPassword(pass, user.password))) {
        const result = { userId: user.userId, login };

        this.logger.log(`Validation of user with login ${login} succeeded`);
        return result;
      }

      return null;
    } catch (err) {
      this.logger.error(
        `Error during validation of user with login ${login}`,
        err,
      );
      throw err;
    }
  }

  generateTokens(payload: IPayload) {
    this.logger.log(
      `Starting tokens generation for user with login ${payload.login}`,
    );

    try {
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
    } catch (err) {
      this.logger.error(
        `Error during tokens generation for user with login ${payload.login}`,
      );
      throw err;
    }
  }

  async register(user: ICreateUser) {
    const isExistingUser =
      (await this.usersService.findByEmail(user.email)) ||
      (await this.usersService.findByLogin(user.login));

    if (isExistingUser)
      throw new ConflictException(
        'User with such email or/and login is already exists',
      );

    user.password = await hashPassword(user.password);

    const newUser = await this.usersService.createUser(user);
    const payload: IPayload = { sub: newUser.userId, login: newUser.login };

    return this.generateTokens(payload);
  }

  async signIn(userData: ISignInUser) {
    const { login, password } = userData;

    this.logger.log(`Starting user authentication with login ${login}...`);

    try {
      const user = await this.validateUser(login, password);

      if (!user) throw new UnauthorizedException('Incorrect login or password');

      const payload: IPayload = { sub: user.userId, login: user.login };

      const tokens = this.generateTokens(payload);

      this.logger.log(
        `Tokens generated, user authentication with login ${login} succeeded`,
      );

      return tokens;
    } catch (err) {
      this.logger.error(
        `Error during user authentication with login ${login}`,
        err,
      );

      throw err;
    }
  }

  refreshTokens(userId: string, login: string) {
    const payload: IPayload = { sub: userId, login };

    try {
      const tokens = this.generateTokens(payload);
      this.logger.log(
        `New tokens for user with login ${login} successfully generated`,
      );
      return tokens;
    } catch (err) {
      this.logger.error(
        `Error during refreshing tokens for user with login ${login}`,
        err,
      );

      throw err;
    }
  }
}
