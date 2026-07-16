import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { UUID } from 'crypto';
import type { ICreateUser, IUser } from 'src/common/interfaces';
import { User } from './entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async findByLogin(login: string) {
    return await this.usersRepository.findOneBy({
      login,
      deleted_at: undefined,
    });
  }

  async findById(id: UUID) {
    return await this.usersRepository.findOneBy({
      userId: id,
      deleted_at: undefined,
    });
  }

  async findByEmail(email: string) {
    return await this.usersRepository.findOneBy({
      email,
      deleted_at: undefined,
    });
  }

  async filterByLogin(login: string, limit?: number, page?: number) {
    const users = await this.usersRepository.find({
      where: { login, deleted_at: undefined },
      select: { login: true, email: true, age: true, description: true },
    });

    if (!limit) return users;
    if (!page) return users.slice(0, limit);

    const totalPages = Math.ceil(users.length / limit);

    const pageToUse = page <= totalPages ? page : totalPages;

    return users.slice((pageToUse - 1) * limit, pageToUse * limit);
  }

  async createUser(user: ICreateUser) {
    const newUser = await this.usersRepository.save(user);
    return newUser;
  }

  async deleteUser(id: UUID) {
    const timestamp = Date.now();
    const user = await this.findById(id);
    if (user) {
      user.deleted_at = timestamp;
      await this.usersRepository.save(user);
    }
  }
}
