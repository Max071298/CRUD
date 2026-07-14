export interface CreateUser {
  login: string;
  email: string;
  password: string;
  age: number;
  description: string;
}

export interface User extends CreateUser {
  userId: string;
}

export interface Payload {
  sub: string;
  login: string;
}
