import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UUID } from 'crypto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

describe('UsersController', () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findById: jest.fn(),
    deleteUser: jest.fn(),
    updateUser: jest.fn(),
    paginateByLogin: jest.fn(),
  };

  const userIdMock = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  const mockRequest = {
    user: {
      userId: userIdMock,
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getPersonalData', () => {
    it('should return user personal data by id from request', async () => {
      const expectedResult = { login: 'test', email: 'test@mail.com', age: 20 };
      mockUsersService.findById.mockResolvedValue(expectedResult);

      const result = await controller.getPersonalData(mockRequest);

      expect(service.findById).toHaveBeenCalledWith(userIdMock);
      expect(result).toEqual(expectedResult);
    });
  });

  describe('deleteUser', () => {
    it('should call service.deleteUser with id from request', async () => {
      mockUsersService.deleteUser.mockResolvedValue(undefined);

      const result = await controller.deleteUser(mockRequest);

      expect(service.deleteUser).toHaveBeenCalledWith(userIdMock);
      expect(result).toBeUndefined();
    });
  });

  describe('updateUser', () => {
    it('should call service.updateUser with id from request and body dto', async () => {
      const dto: UpdateUserDto = { description: 'New description' };
      mockUsersService.updateUser.mockResolvedValue(undefined);

      const result = await controller.updateUser(mockRequest, dto);

      expect(service.updateUser).toHaveBeenCalledWith(userIdMock, dto);
      expect(result).toBeUndefined();
    });
  });

  describe('getUsersData', () => {
    it('should transform query dto to pagination options and call service', async () => {
      const login = 'ivan';
      const dto: PaginationQueryDto = { page: 2, limit: 10 };
      const expectedOptions = { page: 2, limit: 10 };
      const paginatedItemsMock = [{ login: 'ivan1' }, { login: 'ivan2' }];

      mockUsersService.paginateByLogin.mockResolvedValue(paginatedItemsMock);

      const result = await controller.getUsersData(login, dto);

      expect(service.paginateByLogin).toHaveBeenCalledWith(
        login,
        expectedOptions,
      );
      expect(result).toEqual(paginatedItemsMock);
    });
  });
});
