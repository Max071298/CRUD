import {
  IsEmail,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @MinLength(7)
  @IsOptional()
  password?: string;

  @IsNumber()
  @Max(120)
  @IsOptional()
  age?: number;

  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
