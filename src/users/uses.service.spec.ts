import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';
import { paginate } from 'nestjs-typeorm-paginate';
import { UUID } from 'crypto';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

describe('UsersService', () => {
  let service: UsersService;
  let repository: Repository<User>;

  const mockUserRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const userIdMock = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepository,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    repository = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('paginateByLogin', () => {
    it('should return paginated items', async () => {
      const options = { page: 1, limit: 10 };
      const itemsMock = [{ login: 'testUser', email: 'test@mail.com' }];

      (paginate as jest.Mock).mockResolvedValue({ items: itemsMock });

      const result = await service.paginateByLogin('test', options);

      expect(paginate).toHaveBeenCalledWith(
        repository,
        options,
        expect.any(Object),
      );
      expect(result).toEqual(itemsMock);
    });
  });

  describe('findByLogin', () => {
    it('should find user by login', async () => {
      const userMock = {
        userId: userIdMock,
        login: 'testUser',
        password: 'hash',
      };
      mockUserRepository.findOne.mockResolvedValue(userMock);

      const result = await service.findByLogin('testUser');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(result).toEqual(userMock);
    });
  });

  describe('findById', () => {
    it('should find user by id', async () => {
      const userMock = { login: 'testUser', email: 'test@mail.com', age: 25 };
      mockUserRepository.findOne.mockResolvedValue(userMock);

      const result = await service.findById(userIdMock);

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(result).toEqual(userMock);
    });
  });

  describe('findByEmail', () => {
    it('should find user by email', async () => {
      const userMock = { email: 'test@mail.com' };
      mockUserRepository.findOne.mockResolvedValue(userMock);

      const result = await service.findByEmail('test@mail.com');

      expect(mockUserRepository.findOne).toHaveBeenCalledWith(
        expect.any(Object),
      );
      expect(result).toEqual(userMock);
    });
  });

  describe('createUser', () => {
    it('should successfully save and return a new user', async () => {
      const createUserDto = {
        login: 'new',
        email: 'new@mail.com',
        password: '123',
      };
      const savedUserMock = { id: userIdMock, ...createUserDto };
      mockUserRepository.save.mockResolvedValue(savedUserMock);

      const result = await service.createUser(createUserDto as any);

      expect(mockUserRepository.save).toHaveBeenCalledWith(createUserDto);
      expect(result).toEqual(savedUserMock);
    });
  });

  describe('deleteUser', () => {
    it('should update deleted_at if user exists', async () => {
      const userMock = { userId: userIdMock, deleted_at: null };
      mockUserRepository.findOneBy.mockResolvedValue(userMock);
      mockUserRepository.save.mockResolvedValue({
        ...userMock,
        deleted_at: Date.now(),
      });

      await service.deleteUser(userIdMock);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        userId: userIdMock,
      });
      expect(mockUserRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          deleted_at: expect.any(Number),
        }),
      );
    });

    it('should do nothing if user does not exist', async () => {
      mockUserRepository.findOneBy.mockResolvedValue(null);

      await service.deleteUser(userIdMock);

      expect(mockUserRepository.findOneBy).toHaveBeenCalledWith({
        userId: userIdMock,
      });
      expect(mockUserRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('updateUser', () => {
    it('should call repository.update with dynamic timestamp', async () => {
      const updateData = { age: 30 };
      mockUserRepository.update.mockResolvedValue({});

      await service.updateUser(userIdMock, updateData);

      expect(mockUserRepository.update).toHaveBeenCalledWith(
        userIdMock,
        expect.objectContaining({
          age: 30,
          updated_at: expect.any(Number),
        }),
      );
    });
  });
});
