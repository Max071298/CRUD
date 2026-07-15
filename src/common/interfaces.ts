export interface CreateUser {
  login: string;
  email: string;
  password: string;
  age: number;
  description: string;
}

export interface SignInUser extends Pick<CreateUser, 'login' | 'password'> {}

export interface User extends CreateUser {
  userId: string;
}

export interface Payload {
  sub: string;
  login: string;
}
