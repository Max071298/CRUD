import { ApiProperty } from '@nestjs/swagger';
import {
  IsEmail,
  IsNumber,
  IsString,
  Max,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ description: 'Login', example: 'example123', required: true })
  @IsString()
  login: string;

  @ApiProperty({
    description: 'Email',
    example: 'example@test.com',
    required: true,
  })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Password (min length = 7)',
    example: 'Example123!',
    required: true,
  })
  @IsString()
  @MinLength(7)
  password: string;

  @ApiProperty({ description: 'Age', example: 25, required: true })
  @IsNumber()
  @Max(120)
  age: number;

  @ApiProperty({
    description: 'Description about yourself',
    example: 'Adult. Playing football. Like swimming',
    required: true,
  })
  @IsString()
  @MaxLength(1000)
  description: string;
}
