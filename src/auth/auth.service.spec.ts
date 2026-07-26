import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { checkPassword } from 'src/common/checkPassword';

jest.mock('src/common/checkPassword');

describe('AuthService', () => {
  let authService: AuthService;
  let usersService: UsersService;

  const mockedCheckPassword = jest.mocked(checkPassword);

  const mockUsersService = {
    findByLogin: jest.fn(),
    findByEmail: jest.fn(),
    createUser: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('secret_key'),
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mocked_token'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(authService).toBeDefined();
  });

  describe('registration', () => {
    it('should register user, if doesn"t exist', async () => {
      const mockUser = {
        login: 'test',
        email: 'test@example.com',
        password: 'test123',
        age: 25,
        description: 'test description',
      };

      const tokens = {
        access_token: 'mocked_token',
        refresh_token: 'mocked_token',
      };

      jest.spyOn(usersService, 'findByEmail').mockResolvedValue(null);
      jest.spyOn(usersService, 'findByLogin').mockResolvedValue(null);
      jest
        .spyOn(usersService, 'createUser')
        .mockReturnValue({ userId: '123', ...mockUser } as any);

      const result = await authService.register(mockUser);

      expect(usersService.findByEmail).toHaveBeenCalledWith(mockUser.email);
      expect(usersService.findByLogin).toHaveBeenCalledWith(mockUser.login);
      expect(usersService.createUser).toHaveBeenCalledWith(mockUser);

      expect(result).toEqual(tokens);
    });

    it('should throw conflict exception, if user with such login or password already exists', async () => {
      const mockUser = {
        login: 'test',
        email: 'test@example.com',
        password: 'test123',
        age: 25,
        description: 'test description',
      };

      jest
        .spyOn(usersService, 'findByEmail')
        .mockResolvedValue(mockUser as any);
      jest
        .spyOn(usersService, 'findByLogin')
        .mockResolvedValue(mockUser as any);

      await expect(authService.register(mockUser)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('authorization', () => {
    it('should validate user if credentials correct', async () => {
      const mockUser = {
        userId: '123',
        login: 'test',
        email: 'test@example.com',
        password: 'test123',
        age: 25,
        description: 'test description',
      };

      const mockAuthData = { login: 'test', password: 'test123' };

      const mockedTokens = {
        access_token: 'mocked_token',
        refresh_token: 'mocked_token',
      };

      jest
        .spyOn(usersService, 'findByLogin')
        .mockResolvedValue(mockUser as any);

      mockedCheckPassword.mockResolvedValue(true);

      const result = await authService.signIn(mockAuthData);

      expect(usersService.findByLogin).toHaveBeenCalledWith(mockAuthData.login);
      expect(result).toEqual(mockedTokens);
    });

    it('Should throw Unauthorized exception if login doesn"t exist', async () => {
      const mockAuthData = { login: 'test100', password: 'test123' };
      jest.spyOn(usersService, 'findByLogin').mockResolvedValue(null);

      await expect(authService.signIn(mockAuthData)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('Should throw Unauthorized exception if password is incorrect', async () => {
      const mockAuthData = { login: 'test1', password: 'test12345' };
      const mockUser = {
        userId: '1234',
        login: 'test1',
        email: 'test@example.com',
        password: 'test123',
        age: 25,
        description: 'test description',
      };
      jest
        .spyOn(usersService, 'findByLogin')
        .mockResolvedValue(mockUser as any);

      mockedCheckPassword.mockResolvedValue(false);

      await expect(authService.signIn(mockAuthData)).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });
});
