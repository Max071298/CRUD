import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import type { ICreateUser, IUpdateUser, IUser } from 'src/common/interfaces';
import { User } from './entities/user.entity';
import { ILike, IsNull, Repository } from 'typeorm';
import { IPaginationOptions, paginate } from 'nestjs-typeorm-paginate';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async paginateByLogin(login: string, options: IPaginationOptions) {
    return (
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
    return await this.usersRepository.findOne({
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
    }
  }

  async updateUser(id: UUID, data: IUpdateUser) {
    const timestamp = Date.now();
    await this.usersRepository.update(id, { ...data, updated_at: timestamp });
  }
}
