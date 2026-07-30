import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common/decorators';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import type { ICreateUser, IUpdateUser } from 'src/common/interfaces';
import { User } from './entities/user.entity';
import { ILike, IsNull, Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';
import { S3Service } from 'src/providers/files/s3/s3.service';
import {
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

@Injectable()
export class UsersService {
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
    const key = `${login}?limit=${options.limit}?page=${options.page}`;
    const value = await this.cacheManager.get(key);
    if (value) return value;

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

    return data;
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
    const value = await this.cacheManager.get(id);

    if (value) return value;

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
      },
    });

    await this.cacheManager.set(id, user);

    return user;
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
    const timestamp = Date.now();
    const user = await this.usersRepository.findOneBy({ userId: id });
    if (user) {
      user.deleted_at = timestamp;
      await this.usersRepository.save(user);
      await this.cacheManager.del(id);
    }
  }

  async updateUser(id: UUID, data: IUpdateUser) {
    const timestamp = Date.now();
    await this.usersRepository.update(id, { ...data, updated_at: timestamp });
    await this.cacheManager.del(id);
  }

  async uploadAvatar(userId: string, avatar: Express.Multer.File) {
    const avatarName = avatar.originalname;
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

    if (user.avatars.length >= 5)
      throw new ConflictException('The max number of avatars exceeded');

    user.avatars.forEach((file) => {
      if (file.filename === avatarName)
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
  }

  async removeAvatar(userId: string, filename: string) {
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
  }

  async getActiveUsers(dto: ActiveUsersQueryDto) {
    const { minAge, maxAge } = dto;

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
  }

  @Transactional()
  async makeMoneyTransfer(
    senderId: string,
    receiverEmail: string,
    amount: number,
  ) {
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
  }
}
