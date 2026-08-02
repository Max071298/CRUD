import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { UsersService } from 'src/users/users.service';
import { ConfigService } from '@nestjs/config';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;
  let usersService: UsersService;

  const mockUsersService = {
    findById: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn().mockReturnValue('secret_key'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtStrategy,
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
    usersService = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object if exists', async () => {
      const payload = { sub: '123', login: 'test' };

      const validatedUser = { userId: '123', login: 'test' };

      const mockUser = {
        login: 'test',
        email: 'test@example.com',
        age: 10,
        description: 'test description',
      };

      jest.spyOn(usersService, 'findById').mockResolvedValue(mockUser as any);

      const result = await strategy.validate(payload);

      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);

      expect(result).toEqual(validatedUser);
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const payload = { sub: '999', login: 'notfound@example.com' };

      jest.spyOn(usersService, 'findById').mockResolvedValue(null);

      await expect(strategy.validate(payload)).rejects.toThrow(
        UnauthorizedException,
      );

      expect(usersService.findById).toHaveBeenCalledWith(payload.sub);
    });
  });
});
