import { ApiProperty } from '@nestjs/swagger';
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
  @ApiProperty({
    description: 'Email',
    example: 'example@test.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({
    description: 'Password (min length = 7)',
    example: 'Example123!',
    required: false,
  })
  @IsString()
  @MinLength(7)
  @IsOptional()
  password?: string;

  @ApiProperty({ description: 'Age', example: 25, required: false })
  @IsNumber()
  @Max(120)
  @IsOptional()
  age?: number;

  @ApiProperty({
    description: 'Description about yourself',
    example: 'Adult. Playing football. Like swimming',
    required: false,
  })
  @IsString()
  @MaxLength(1000)
  @IsOptional()
  description?: string;
}
