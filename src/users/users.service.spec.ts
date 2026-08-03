import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import { paginate } from 'nestjs-typeorm-paginate';
import { Between, Not, QueryFailedError } from 'typeorm';
import { S3Service } from 'src/providers/files/s3/s3.service';
import { Avatar } from './entities/avatars.entity';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';
import { ILike, IsNull } from 'typeorm';

jest.mock('nestjs-typeorm-paginate', () => ({
  paginate: jest.fn(),
}));

jest.mock('typeorm-transactional', () => ({
  Transactional: () => () => undefined,
}));

describe('UsersService', () => {
  let service: UsersService;

  const usersRepository = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    find: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    updateAll: jest.fn(),
    decrement: jest.fn(),
    increment: jest.fn(),
  };

  const avatarsRepository = {
    save: jest.fn(),
    update: jest.fn(),
  };

  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  };

  const s3Service = {
    uploadFile: jest.fn(),
    removeFile: jest.fn(),
  };

  const userId = '123e4567-e89b-12d3-a456-426614174000' as UUID;

  beforeEach(async () => {
    jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: CACHE_MANAGER, useValue: cacheManager },
        { provide: getRepositoryToken(User), useValue: usersRepository },
        { provide: getRepositoryToken(Avatar), useValue: avatarsRepository },
        { provide: S3Service, useValue: s3Service },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('paginateByLogin', () => {
    const options = { page: 2, limit: 10 };
    const cacheKey = 'john?limit=10?page=2';

    it('returns cached data without querying the repository', async () => {
      const cached = [{ login: 'john' }];
      cacheManager.get.mockResolvedValue(cached);

      await expect(service.paginateByLogin('john', options)).resolves.toBe(
        cached,
      );
      expect(cacheManager.get).toHaveBeenCalledWith(cacheKey);
      expect(paginate).not.toHaveBeenCalled();
      expect(cacheManager.set).not.toHaveBeenCalled();
    });

    it('queries, caches and returns data on a cache miss', async () => {
      const items = [{ login: 'john', email: 'john@example.com' }];
      cacheManager.get.mockResolvedValue(undefined);
      jest.mocked(paginate).mockResolvedValue({ items } as never);

      await expect(service.paginateByLogin('john', options)).resolves.toEqual(
        items,
      );
      expect(paginate).toHaveBeenCalledWith(usersRepository, options, {
        select: {
          login: true,
          email: true,
          age: true,
          description: true,
        },
        where: {
          login: ILike('%john%'),
          deleted_at: IsNull(),
        },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(cacheKey, items);
    });

    it('rethrows errors', async () => {
      const error = new Error('cache unavailable');
      cacheManager.get.mockRejectedValue(error);

      await expect(service.paginateByLogin('john', options)).rejects.toBe(
        error,
      );
    });
  });

  describe('find methods', () => {
    it('findByLogin returns authentication fields of a non-deleted user', async () => {
      const user = {
        userId,
        login: 'john',
        password: 'hash',
      };

      usersRepository.findOne.mockResolvedValue(user);

      await expect(service.findByLogin('john')).resolves.toBe(user);

      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          login: 'john',
          deleted_at: IsNull(),
        },
        select: {
          userId: true,
          login: true,
          password: true,
        },
      });
    });

    it('findById returns cached data', async () => {
      const cached = { login: 'john', balance: 100 };
      cacheManager.get.mockResolvedValue(cached);

      await expect(service.findById(userId)).resolves.toBe(cached);
      expect(usersRepository.findOne).not.toHaveBeenCalled();
    });

    it('findById queries and caches data on a cache miss', async () => {
      const user = { login: 'john', balance: 100 };
      cacheManager.get.mockResolvedValue(undefined);
      usersRepository.findOne.mockResolvedValue(user);

      await expect(service.findById(userId)).resolves.toBe(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId,
          deleted_at: IsNull(),
        },
        select: {
          login: true,
          email: true,
          age: true,
          description: true,
          balance: true,
        },
      });
      expect(cacheManager.set).toHaveBeenCalledWith(userId, user);
    });

    it('findById catches repository errors', async () => {
      cacheManager.get.mockResolvedValue(undefined);
      usersRepository.findOne.mockRejectedValue(new Error('database error'));

      await expect(service.findById(userId)).rejects.toThrow('database error');
    });

    it('findByEmail returns only the email field', async () => {
      const user = { email: 'john@example.com' };
      usersRepository.findOne.mockResolvedValue(user);

      await expect(service.findByEmail(user.email)).resolves.toBe(user);
      expect(usersRepository.findOne).toHaveBeenCalledWith({
        where: {
          email: user.email,
          deleted_at: IsNull(),
        },
        select: { email: true },
      });
    });
  });

  describe('createUser', () => {
    it('saves and returns a user', async () => {
      const data = {
        login: 'john',
        email: 'john@example.com',
        password: 'secret',
        age: 30,
        description: 'Developer',
      };
      const saved = { userId, ...data };
      usersRepository.save.mockResolvedValue(saved);

      await expect(service.createUser(data)).resolves.toBe(saved);
      expect(usersRepository.save).toHaveBeenCalledWith(data);
    });
  });

  describe('deleteUser', () => {
    it('soft-deletes a user and invalidates the cache', async () => {
      const timestamp = 1_700_000_000_000;
      const user = { userId, deleted_at: null };
      jest.spyOn(Date, 'now').mockReturnValue(timestamp);
      usersRepository.findOneBy.mockResolvedValue(user);
      usersRepository.save.mockResolvedValue(user);

      await service.deleteUser(userId);

      expect(user.deleted_at).toBe(timestamp);
      expect(usersRepository.save).toHaveBeenCalledWith(user);
      expect(cacheManager.del).toHaveBeenCalledWith(userId);
    });

    it('does nothing if the user does not exist', async () => {
      usersRepository.findOneBy.mockResolvedValue(null);

      await service.deleteUser(userId);

      expect(usersRepository.save).not.toHaveBeenCalled();
      expect(cacheManager.del).not.toHaveBeenCalled();
    });

    it('catches repository errors', async () => {
      usersRepository.findOneBy.mockRejectedValue(new Error('database error'));

      await expect(service.deleteUser(userId)).rejects.toThrow(
        'database error',
      );
    });
  });

  describe('updateUser', () => {
    it('updates a user with a timestamp and invalidates the cache', async () => {
      const timestamp = 1_700_000_000_000;
      const data = { age: 31 };
      jest.spyOn(Date, 'now').mockReturnValue(timestamp);

      await service.updateUser(userId, data);

      expect(usersRepository.update).toHaveBeenCalledWith(userId, {
        age: 31,
        updated_at: timestamp,
      });
      expect(cacheManager.del).toHaveBeenCalledWith(userId);
    });

    it('catches repository errors', async () => {
      usersRepository.update.mockRejectedValue(new Error('database error'));

      await expect(service.updateUser(userId, { age: 31 })).rejects.toThrow(
        'database error',
      );
      expect(cacheManager.del).not.toHaveBeenCalled();
    });
  });

  describe('uploadAvatar', () => {
    const file = {
      originalname: 'avatar.png',
      buffer: Buffer.from('image'),
    } as Express.Multer.File;

    it('uploads an avatar to S3 and saves its metadata', async () => {
      const timestamp = 1_700_000_000_000;
      const user = { userId, avatars: [] };
      jest.spyOn(Date, 'now').mockReturnValue(timestamp);
      usersRepository.findOne.mockResolvedValue(user);

      await service.uploadAvatar(userId, file);

      expect(s3Service.uploadFile).toHaveBeenCalledWith({
        file,
        folder: userId,
        name: file.originalname,
      });
      expect(avatarsRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          filename: file.originalname,
          uploaded_at: timestamp,
          user,
        }),
      );
    });

    it('throws NotFoundException if the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(service.uploadAvatar(userId, file)).rejects.toBeInstanceOf(
        NotFoundException,
      );
      expect(s3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('throws ConflictException for a duplicate active filename', async () => {
      usersRepository.findOne.mockResolvedValue({
        userId,
        avatars: [{ filename: file.originalname, deleted_at: null }],
      });

      await expect(service.uploadAvatar(userId, file)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });

    it('throws ConflictException when the avatar limit is exceeded', async () => {
      usersRepository.findOne.mockResolvedValue({
        userId,
        avatars: Array.from({ length: 5 }, (_, index) => ({
          filename: `old-${index}.png`,
          deleted_at: 1,
        })),
      });

      await expect(service.uploadAvatar(userId, file)).rejects.toThrow(
        'The max number of avatars exceeded',
      );
    });
  });

  describe('removeAvatar', () => {
    it('removes a file from S3 and soft-deletes its metadata', async () => {
      const timestamp = 1_700_000_000_000;
      const avatar = { avatarId: 'avatar-id', filename: 'avatar.png' };
      usersRepository.findOne.mockResolvedValue({ userId, avatars: [avatar] });
      jest.spyOn(Date, 'now').mockReturnValue(timestamp);

      await service.removeAvatar(userId, avatar.filename);

      expect(s3Service.removeFile).toHaveBeenCalledWith({
        path: `${userId}/${avatar.filename}`,
      });
      expect(avatarsRepository.update).toHaveBeenCalledWith(avatar.avatarId, {
        deleted_at: timestamp,
      });
    });

    it('throws NotFoundException if the user does not exist', async () => {
      usersRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeAvatar(userId, 'avatar.png'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws NotFoundException if the avatar does not exist', async () => {
      usersRepository.findOne.mockResolvedValue({ userId, avatars: [] });

      await expect(
        service.removeAvatar(userId, 'missing.png'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('getActiveUsers', () => {
    it('returns mapped users having more than two avatars', async () => {
      usersRepository.find.mockResolvedValue([
        {
          email: 'active@example.com',
          age: 30,
          description: 'Active',
          avatars: [
            { filename: 'newest.png' },
            { filename: 'second.png' },
            { filename: 'third.png' },
          ],
        },
        {
          email: 'inactive@example.com',
          age: 31,
          description: 'Inactive',
          avatars: [{ filename: 'only.png' }],
        },
      ]);

      await expect(
        service.getActiveUsers({ minAge: 18, maxAge: 40 }),
      ).resolves.toEqual([
        {
          email: 'active@example.com',
          age: 30,
          description: 'Active',
          avatar: 'newest.png',
        },
      ]);
      expect(usersRepository.find).toHaveBeenCalledWith({
        where: {
          age: Between(18, 40),
          deleted_at: IsNull(),
          description: Not(IsNull()),
          avatars: {
            deleted_at: IsNull(),
          },
        },
        relations: {
          avatars: true,
        },
        order: {
          avatars: {
            uploaded_at: 'DESC',
          },
        },
        select: {
          userId: true,
          email: true,
          age: true,
          description: true,
          avatars: true,
        },
      });
    });

    it('rethrows repository errors', async () => {
      const error = new Error('database error');
      usersRepository.find.mockRejectedValue(error);

      await expect(
        service.getActiveUsers({ minAge: 18, maxAge: 40 }),
      ).rejects.toBe(error);
    });
  });

  describe('makeMoneyTransfer', () => {
    it('decrements the sender and increments the receiver', async () => {
      await service.makeMoneyTransfer(userId, 'receiver@example.com', 50);

      expect(usersRepository.decrement).toHaveBeenCalledWith(
        { userId },
        'balance',
        50,
      );
      expect(usersRepository.increment).toHaveBeenCalledWith(
        { email: 'receiver@example.com' },
        'balance',
        50,
      );
      expect(
        usersRepository.decrement.mock.invocationCallOrder[0],
      ).toBeLessThan(usersRepository.increment.mock.invocationCallOrder[0]);
    });

    it('throws HTTP 402 for the balance check constraint', async () => {
      const error = new QueryFailedError('UPDATE users', [], {
        name: 'driver error',
        message: 'check constraint failed',
        code: '23514',
        table: '23514',
      });
      usersRepository.decrement.mockRejectedValue(error);

      await expect(
        service.makeMoneyTransfer(userId, 'receiver@example.com', 500),
      ).rejects.toThrow(QueryFailedError);
      expect(usersRepository.increment).not.toHaveBeenCalled();
    });

    it('rethrows other errors', async () => {
      const error = new Error('database error');
      usersRepository.decrement.mockRejectedValue(error);

      await expect(
        service.makeMoneyTransfer(userId, 'receiver@example.com', 50),
      ).rejects.toBe(error);
    });
  });

  describe('balance operations', () => {
    it('resetBalances resets every balance to zero', async () => {
      await service.resetBalances();

      expect(usersRepository.updateAll).toHaveBeenCalledWith({ balance: 0 });
    });

    it('resetBalances rethrows errors', async () => {
      const error = new Error('database error');
      usersRepository.updateAll.mockRejectedValue(error);

      await expect(service.resetBalances()).rejects.toBe(error);
    });

    it('setBalance updates a user selected by login', async () => {
      await service.setBalance({ login: 'john', amount: 250 });

      expect(usersRepository.update).toHaveBeenCalledWith(
        { login: 'john' },
        { balance: 250 },
      );
    });

    it('setBalance rethrows errors', async () => {
      const error = new Error('database error');
      usersRepository.update.mockRejectedValue(error);

      await expect(
        service.setBalance({ login: 'john', amount: 250 }),
      ).rejects.toBe(error);
    });
  });
});
