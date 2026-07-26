import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    signIn: jest.fn(),
    refreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user', async () => {
      const dto = {
        login: 'test',
        password: '123456',
      };

      const expectedResult = {
        id: 1,
        login: 'test',
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const result = await controller.register(dto as any);

      expect(authService.register).toHaveBeenCalledWith(dto);

      expect(result).toEqual(expectedResult);
    });
  });

  describe('signIn', () => {
    it('should sign in user', async () => {
      const dto = {
        login: 'test',
        password: '123456',
      };

      const expectedResult = {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.signIn.mockResolvedValue(expectedResult);

      const result = await controller.signIn(dto);

      expect(authService.signIn).toHaveBeenCalledWith(dto);

      expect(result).toEqual(expectedResult);
    });
  });
  describe('refresh', () => {
    it('should refresh tokens', async () => {
      const req = {
        user: {
          userId: 1,
          login: 'test',
        },
      };

      const expectedResult = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResult);

      const result = await controller.refresh(req);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        req.user.userId,
        req.user.login,
      );

      expect(result).toEqual(expectedResult);
    });
  });
});
