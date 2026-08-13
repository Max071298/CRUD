export interface ICreateUser {
  login: string;
  email: string;
  password: string;
  age: number;
  description: string;
}

export type ISignInUser = Pick<ICreateUser, 'login' | 'password'>;

export interface IUser extends ICreateUser {
  userId: string;
}

export interface IPayload {
  sub: string;
  login: string;
}

export interface IUpdateUser {
  email?: string;
  password?: string;
  age?: number;
  description?: string;
}

export interface DatabaseDriverError extends Error {
  code: string;
  detail?: string;
  table?: string;
}
