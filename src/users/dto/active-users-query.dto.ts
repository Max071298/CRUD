import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsPositive } from 'class-validator';

export class ActiveUsersQueryDto {
  @ApiProperty({ description: 'Min age', example: 5, required: true })
  @IsPositive()
  @Type(() => Number)
  minAge: number;

  @ApiProperty({ description: 'Max age', example: 39, required: true })
  @IsPositive()
  @Type(() => Number)
  maxAge: number;
}
