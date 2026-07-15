import { Injectable } from '@nestjs/common';
import { randomUUID, UUID } from 'crypto';
import { CreateUser, User } from 'src/common/interfaces';

@Injectable()
export class UsersService {
  private readonly users: User[] = [
    {
      userId: '8cfd17e7-63eb-409d-9571-0323a3544e75',
      login: 'max',
      email: 'maks123@mail.ru',
      password: '12345678',
      age: 22,
      description: 'My name is Max',
    },
  ];

  async findByLogin(login: string) {
    return this.users.find((user) => user.login === login);
  }

  async findById(id: UUID) {
    return this.users.find((user) => user.userId === id);
  }

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email);
  }

  async filterByLogin(login: string, limit?: number, page?: number) {
    const users = this.users
      .filter((user) => user.login.includes(login))
      .map((user) => {
        (user.login, user.email, user.age, user.description);
      });

    if (!limit) return users;
    if (!page) return users.slice(0, limit);

    const totalPages = Math.ceil(users.length / limit);

    const pageToUse = page <= totalPages ? page : totalPages;

    return users.slice((pageToUse - 1) * limit, pageToUse * limit);
  }

  async createUser(user: CreateUser) {
    const userId = randomUUID();
    const newUser = { userId, ...user };
    this.users.push(newUser);
    return newUser;
  }
}
