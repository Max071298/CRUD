import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class RemoveAvatarDto {
  @ApiProperty({
    description: 'Avatar filename',
    example: 'test.jpg',
    required: true,
  })
  @IsString()
  filename: string;
}
