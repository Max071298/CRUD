import {
  ConflictException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { checkPassword } from 'src/common/checkPassword';
import { hashPassword } from 'src/common/hashPassword';
import { ICreateUser, IPayload } from 'src/common/interfaces';
import { UsersService } from 'src/users/users.service';
import { AuthService } from './auth.service';

jest.mock('src/common/checkPassword', () => ({
  checkPassword: jest.fn(),
}));

jest.mock('src/common/hashPassword', () => ({
  hashPassword: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const configGet = jest.fn();
  const jwtSign = jest.fn();

  const usersService = {
    findByLogin: jest.fn(),
    findByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  const checkPasswordMock = jest.mocked(checkPassword);
  const hashPasswordMock = jest.mocked(hashPassword);

  const tokens = {
    access_token: 'access-token',
    refresh_token: 'refresh-token',
  };

  beforeEach(() => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    service = new AuthService(
      { get: configGet } as unknown as ConfigService,
      usersService as unknown as UsersService,
      { sign: jwtSign } as unknown as JwtService,
    );
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  describe('validateUser', () => {
    it('returns userId and login when credentials are valid', async () => {
      usersService.findByLogin.mockResolvedValue({
        userId: 'user-id',
        login: 'john',
        password: 'hashed-password',
      });
      checkPasswordMock.mockResolvedValue(true);

      await expect(
        service.validateUser('john', 'plain-password'),
      ).resolves.toEqual({
        userId: 'user-id',
        login: 'john',
      });

      expect(usersService.findByLogin).toHaveBeenCalledWith('john');
      expect(checkPasswordMock).toHaveBeenCalledWith(
        'plain-password',
        'hashed-password',
      );
    });

    it('returns null when the user does not exist', async () => {
      usersService.findByLogin.mockResolvedValue(null);

      await expect(
        service.validateUser('missing-user', 'password'),
      ).resolves.toBeNull();

      expect(checkPasswordMock).not.toHaveBeenCalled();
    });

    it('returns null when the password is incorrect', async () => {
      usersService.findByLogin.mockResolvedValue({
        userId: 'user-id',
        login: 'john',
        password: 'hashed-password',
      });
      checkPasswordMock.mockResolvedValue(false);

      await expect(
        service.validateUser('john', 'wrong-password'),
      ).resolves.toBeNull();

      expect(checkPasswordMock).toHaveBeenCalledWith(
        'wrong-password',
        'hashed-password',
      );
    });

    it('rethrows errors from UsersService', async () => {
      const error = new Error('Database error');
      usersService.findByLogin.mockRejectedValue(error);

      await expect(service.validateUser('john', 'password')).rejects.toBe(
        error,
      );
    });

    it('rethrows errors from checkPassword', async () => {
      const error = new Error('Password comparison error');

      usersService.findByLogin.mockResolvedValue({
        userId: 'user-id',
        login: 'john',
        password: 'hashed-password',
      });
      checkPasswordMock.mockRejectedValue(error);

      await expect(service.validateUser('john', 'password')).rejects.toBe(
        error,
      );
    });
  });

  describe('generateTokens', () => {
    it('generates access and refresh tokens with configured options', () => {
      const payload: IPayload = {
        sub: 'user-id',
        login: 'john',
      };

      configGet.mockImplementation((key: string) => {
        const config: Record<string, string> = {
          JWT_SECRET_KEY: 'access-secret',
          TOKEN_EXPIRE_TIME: '15m',
          JWT_SECRET_REFRESH_KEY: 'refresh-secret',
          TOKEN_REFRESH_EXPIRE_TIME: '7d',
        };

        return config[key];
      });

      jwtSign
        .mockReturnValueOnce(tokens.access_token)
        .mockReturnValueOnce(tokens.refresh_token);

      expect(service.generateTokens(payload)).toEqual(tokens);

      expect(jwtSign).toHaveBeenNthCalledWith(1, payload, {
        secret: 'access-secret',
        expiresIn: '15m',
      });

      expect(jwtSign).toHaveBeenNthCalledWith(2, payload, {
        secret: 'refresh-secret',
        expiresIn: '7d',
      });

      expect(configGet).toHaveBeenCalledWith('JWT_SECRET_KEY');
      expect(configGet).toHaveBeenCalledWith('TOKEN_EXPIRE_TIME');
      expect(configGet).toHaveBeenCalledWith('JWT_SECRET_REFRESH_KEY');
      expect(configGet).toHaveBeenCalledWith('TOKEN_REFRESH_EXPIRE_TIME');
    });

    it('rethrows token generation errors', () => {
      const payload: IPayload = {
        sub: 'user-id',
        login: 'john',
      };
      const error = new Error('JWT signing error');

      jwtSign.mockImplementation(() => {
        throw error;
      });

      expect(() => service.generateTokens(payload)).toThrow(error);
    });
  });

  describe('register', () => {
    const createUser = (): ICreateUser => ({
      login: 'john',
      email: 'john@example.com',
      password: 'plain-password',
      age: 30,
      description: 'Developer',
    });

    it('throws ConflictException when the email already exists', async () => {
      const user = createUser();

      usersService.findByEmail.mockResolvedValue({
        email: user.email,
      });

      await expect(service.register(user)).rejects.toThrow(
        new ConflictException(
          'User with such email or/and login is already exists',
        ),
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith(user.email);
      expect(usersService.findByLogin).not.toHaveBeenCalled();
      expect(hashPasswordMock).not.toHaveBeenCalled();
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the login already exists', async () => {
      const user = createUser();

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByLogin.mockResolvedValue({
        userId: 'existing-user-id',
        login: user.login,
        password: 'hash',
      });

      await expect(service.register(user)).rejects.toBeInstanceOf(
        ConflictException,
      );

      expect(usersService.findByEmail).toHaveBeenCalledWith(user.email);
      expect(usersService.findByLogin).toHaveBeenCalledWith(user.login);
      expect(hashPasswordMock).not.toHaveBeenCalled();
      expect(usersService.createUser).not.toHaveBeenCalled();
    });

    it('hashes the password, creates the user and returns tokens', async () => {
      const user = createUser();
      const hashedPassword = 'hashed-password';

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByLogin.mockResolvedValue(null);
      hashPasswordMock.mockResolvedValue(hashedPassword);
      usersService.createUser.mockResolvedValue({
        ...user,
        userId: 'new-user-id',
        password: hashedPassword,
      });

      const generateTokensSpy = jest
        .spyOn(service, 'generateTokens')
        .mockReturnValue(tokens);

      await expect(service.register(user)).resolves.toEqual(tokens);

      expect(hashPasswordMock).toHaveBeenCalledWith('plain-password');

      expect(usersService.createUser).toHaveBeenCalledWith({
        ...user,
        password: hashedPassword,
      });

      expect(generateTokensSpy).toHaveBeenCalledWith({
        sub: 'new-user-id',
        login: 'john',
      });
    });

    it('does not create the user when password hashing fails', async () => {
      const user = createUser();
      const error = new Error('Hashing error');

      usersService.findByEmail.mockResolvedValue(null);
      usersService.findByLogin.mockResolvedValue(null);
      hashPasswordMock.mockRejectedValue(error);

      await expect(service.register(user)).rejects.toBe(error);

      expect(usersService.createUser).not.toHaveBeenCalled();
    });
  });

  describe('signIn', () => {
    it('validates credentials and returns generated tokens', async () => {
      const validateUserSpy = jest
        .spyOn(service, 'validateUser')
        .mockResolvedValue({
          userId: 'user-id',
          login: 'john',
        });

      const generateTokensSpy = jest
        .spyOn(service, 'generateTokens')
        .mockReturnValue(tokens);

      await expect(
        service.signIn({
          login: 'john',
          password: 'plain-password',
        }),
      ).resolves.toEqual(tokens);

      expect(validateUserSpy).toHaveBeenCalledWith('john', 'plain-password');

      expect(generateTokensSpy).toHaveBeenCalledWith({
        sub: 'user-id',
        login: 'john',
      });
    });

    it('throws UnauthorizedException when credentials are invalid', async () => {
      jest.spyOn(service, 'validateUser').mockResolvedValue(null);

      await expect(
        service.signIn({
          login: 'john',
          password: 'wrong-password',
        }),
      ).rejects.toThrow(
        new UnauthorizedException('Incorrect login or password'),
      );
    });

    it('rethrows validation errors', async () => {
      const error = new Error('Validation error');

      jest.spyOn(service, 'validateUser').mockRejectedValue(error);

      await expect(
        service.signIn({
          login: 'john',
          password: 'password',
        }),
      ).rejects.toBe(error);
    });

    it('rethrows token generation errors', async () => {
      const error = new Error('Token generation error');

      jest.spyOn(service, 'validateUser').mockResolvedValue({
        userId: 'user-id',
        login: 'john',
      });

      jest.spyOn(service, 'generateTokens').mockImplementation(() => {
        throw error;
      });

      await expect(
        service.signIn({
          login: 'john',
          password: 'password',
        }),
      ).rejects.toBe(error);
    });
  });

  describe('refreshTokens', () => {
    it('returns new tokens for the supplied user', () => {
      const generateTokensSpy = jest
        .spyOn(service, 'generateTokens')
        .mockReturnValue(tokens);

      expect(service.refreshTokens('user-id', 'john')).toEqual(tokens);

      expect(generateTokensSpy).toHaveBeenCalledWith({
        sub: 'user-id',
        login: 'john',
      });
    });

    it('rethrows token generation errors', () => {
      const error = new Error('Token generation error');

      jest.spyOn(service, 'generateTokens').mockImplementation(() => {
        throw error;
      });

      expect(() => service.refreshTokens('user-id', 'john')).toThrow(error);
    });
  });
});
