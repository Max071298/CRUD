import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateUser, User } from 'src/common/interfaces';

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    {
      userId: '1',
      login: 'max',
      email: 'maks123@mail.ru',
      password: '12345',
      age: 22,
      description: 'My name is Max',
    },
  ];

  async findByLogin(login: string) {
    return this.users.find((user) => user.login === login);
  }

  async findById(id: string) {
    return this.users.find((user) => user.userId === id);
  }

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email);
  }

  async createUser(user: CreateUser) {
    const userId = randomUUID();
    const newUser = { userId, ...user };
    this.users.push(newUser);
    return newUser;
  }
}
