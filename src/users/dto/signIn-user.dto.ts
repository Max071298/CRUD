import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SignInUserDto {
  @ApiProperty({ description: 'Login', example: 'test123', required: true })
  @IsString()
  login: string;

  @ApiProperty({
    description: 'Password (min length = 7)',
    example: 'Example123!',
    required: true,
  })
  @IsString()
  @MinLength(7)
  password: string;
}
