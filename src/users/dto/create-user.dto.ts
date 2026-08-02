import {
  IsEmail,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  login: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(7)
  password: string;

  @IsNumber()
  @Max(120)
  age: number;

  @IsString()
  @MaxLength(1000)
  description: string;
}
