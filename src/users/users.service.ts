import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import type { ICreateUser, IUpdateUser } from 'src/common/interfaces';
import { User } from './entities/user.entity';
import { ILike, IsNull, QueryFailedError, Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { S3Service } from 'src/providers/files/s3/s3.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common/exceptions';
import { Avatar } from './entities/avatars.entity';
import { ActiveUsersQueryDto } from './dto/active-users-query.dto';
import { Between } from 'typeorm/find-options/operator/Between.js';
import { Not } from 'typeorm/find-options/operator/Not.js';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { type Cache } from 'cache-manager';
import { Transactional } from 'typeorm-transactional';
import { SetBalanceDto } from './dto/set-balance.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
    @InjectRepository(Avatar)
    private avatarsRepository: Repository<Avatar>,
    private s3Service: S3Service,
  ) {}

  async paginateByLogin(login: string, options: IPaginationOptions) {
    this.logger.log(
      `Starting pagination by login:${login}, limitPerPage:${options.limit}, page:${options.page}...`,
    );

    try {
      const key = `${login}?limit=${options.limit}?page=${options.page}`;
      const value = await this.cacheManager.get(key);
      if (value) {
        this.logger.log(
          `Pagination by login:${login}, limitPerPage:${options.limit}, page:${options.page} succeeded`,
        );
        return value;
      }

      const data = (
        await paginate(this.usersRepository, options, {
          select: {
            login: true,
            email: true,
            age: true,
            description: true,
          },
          where: { login: ILike(`%${login}%`), deleted_at: IsNull() },
        })
      ).items;

      await this.cacheManager.set(key, data);

      this.logger.log(
        `Pagination by login:${login}, limitPerPage:${options.limit}, page:${options.page} succeeded`,
      );

      return data;
    } catch (err) {
      this.logger.error(
        `Error during pagination by login:${login}, limitPerPage:${options.limit}, page:${options.page}`,
        err,
      );

      throw err;
    }
  }

  async findByLogin(login: string) {
    return await this.usersRepository.findOne({
      where: {
        login,
        deleted_at: IsNull(),
      },
      select: {
        userId: true,
        login: true,
        password: true,
      },
    });
  }

  async findById(id: UUID) {
    this.logger.log(`Search for information about userId:${id}`);

    try {
      const value = await this.cacheManager.get(id);

      if (value) {
        this.logger.log(`Information about userId:${id} found successfully`);
        return value;
      }

      const user = await this.usersRepository.findOne({
        where: {
          userId: id,
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

      await this.cacheManager.set(id, user);

      this.logger.log(`Information about userId:${id} found successfully`);

      return user;
    } catch (err) {
      this.logger.error(
        `Failed to search for information about userId:${id}`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findOne({
      where: {
        email,
        deleted_at: IsNull(),
      },
      select: {
        email: true,
      },
    });
  }

  async createUser(user: ICreateUser) {
    const newUser = await this.usersRepository.save(user);
    return newUser;
  }

  async deleteUser(id: UUID) {
    this.logger.log(`Deleting information about userId:${id}...`);

    try {
      const timestamp = Date.now();
      const user = await this.usersRepository.findOneBy({ userId: id });
      if (user) {
        user.deleted_at = timestamp;
        await this.usersRepository.save(user);
        await this.cacheManager.del(id);
      }
    } catch (err) {
      this.logger.error(
        `Error during userId:${id} deletion!`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  async updateUser(id: UUID, data: IUpdateUser) {
    this.logger.log(`Updating information about userId:${id}...`);
    try {
      const timestamp = Date.now();
      await this.usersRepository.update(id, { ...data, updated_at: timestamp });
      await this.cacheManager.del(id);
      this.logger.log(`Information about userId:${id} successfully updated!`);
    } catch (err) {
      this.logger.error(
        `Error during userId:${id} update`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  async uploadAvatar(userId: string, avatar: Express.Multer.File) {
    this.logger.log(`Uploading avatar for userId:${userId}...`);

    try {
      const avatarName = avatar.originalname;
      const user = await this.usersRepository.findOne({
        where: {
          userId,
          deleted_at: IsNull(),
        },
        relations: { avatars: true },
      });

      if (!user) throw new NotFoundException();

      if (
        user.avatars.filter((avatar) => avatar.deleted_at === null).length >= 5
      )
        throw new ConflictException('The max number of avatars exceeded');

      user.avatars.forEach((file) => {
        if (file.filename === avatarName && file.deleted_at === null)
          throw new ConflictException('Avatar with such name already exists');
      });

      const UploadFilePayload = {
        file: avatar,
        folder: user.userId,
        name: avatarName,
      };

      await this.s3Service.uploadFile(UploadFilePayload);

      const newAvatar = new Avatar();
      newAvatar.filename = avatarName;
      newAvatar.uploaded_at = Date.now();
      newAvatar.user = user;

      await this.avatarsRepository.save(newAvatar);
    } catch (err) {
      this.logger.error(
        `Error during uploading avatar for userId:${userId}`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  async removeAvatar(userId: string, filename: string) {
    this.logger.log(`Deleting avatar for userId:${userId}...`);

    try {
      const user = await this.usersRepository.findOne({
        where: {
          userId,
          deleted_at: IsNull(),
          avatars: {
            deleted_at: IsNull(),
          },
        },
        relations: { avatars: true },
      });

      if (!user) throw new NotFoundException();

      const avatar = user.avatars.find((file) => file.filename === filename);

      if (!avatar) throw new NotFoundException();

      const removeFilePayload = {
        path: `${user.userId}/${filename}`,
      };

      await this.s3Service.removeFile(removeFilePayload);

      await this.avatarsRepository.update(avatar.avatarId, {
        deleted_at: Date.now(),
      });
    } catch (err) {
      this.logger.error(
        `Error during deleting avatar for userId:${userId}`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  async getActiveUsers(dto: ActiveUsersQueryDto) {
    const { minAge, maxAge } = dto;

    this.logger.log(
      `Searching for the most active users with age from ${minAge} to ${maxAge}...`,
    );

    try {
      const users = await this.usersRepository.find({
        where: {
          age: Between(minAge, maxAge),
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

      const activeUsers = users.filter((user) => user.avatars.length > 2);

      return activeUsers.map((user) => {
        return {
          email: user.email,
          age: user.age,
          description: user.description,
          avatar: user.avatars[0].filename,
        };
      });
    } catch (err) {
      this.logger.error(
        `Error during the searching for the most active users with age from ${minAge} to ${maxAge}`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  @Transactional()
  async makeMoneyTransfer(
    senderId: string,
    receiverEmail: string,
    amount: number,
  ) {
    this.logger.log(
      `Start money transfer transaction between senderId:${senderId} and receiverEmail:${receiverEmail}`,
    );

    try {
      const receiver = await this.usersRepository.findOne({
        where: { email: receiverEmail, deleted_at: IsNull() },
        select: { userId: true },
      });

      if (!receiver) throw new NotFoundException('Receiver not found');
      if (receiver.userId === senderId)
        throw new BadRequestException('Cannot transfer to yourself');

      await this.usersRepository.decrement(
        { userId: senderId },
        'balance',
        amount,
      );

      await this.usersRepository.increment(
        { email: receiverEmail },
        'balance',
        amount,
      );

      await this.cacheManager.del(senderId);
      await this.cacheManager.del(receiver.userId);

      this.logger.log(
        `Money transfer transaction between senderId:${senderId} and receiverEmail:${receiverEmail} DONE`,
      );
    } catch (err) {
      this.logger.error(
        `Error during money transfer transaction between senderId:${senderId} and receiverEmail:${receiverEmail}`,
        err instanceof QueryFailedError ? err.driverError : err,
      );

      throw err;
    }
  }

  async resetBalances() {
    this.logger.log('Start of the users balance reset operation');
    try {
      await this.usersRepository.updateAll({ balance: 0 });
      await this.cacheManager.clear();
      this.logger.log('Users balance reset operation successfully done');
    } catch (err) {
      this.logger.error(
        'Error during users balance reset operation',
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }

  async setBalance(data: SetBalanceDto) {
    const { login, amount } = data;
    this.logger.log(
      `Setting the balance with amount ${amount}$ for user with login:${login}...`,
    );
    try {
      const user = await this.usersRepository.findOne({
        where: { login, deleted_at: IsNull() },
        select: { userId: true },
      });

      if (!user)
        throw new NotFoundException(`User with login ${login} not found`);
      await this.usersRepository.update({ login }, { balance: amount });

      await this.cacheManager.del(user.userId);
      this.logger.log(
        `Balance with amount ${amount}$ successfully added for user with login:${login}`,
      );
    } catch (err) {
      this.logger.error(
        `Error during setting the balance with amount ${amount}$ for user with login:${login}`,
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }
}
