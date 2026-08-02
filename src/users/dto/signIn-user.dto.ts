import { IsString, MinLength } from 'class-validator';

export class SignInUserDto {
  @IsString()
  login: string;

  @IsString()
  @MinLength(7)
  password: string;
}
