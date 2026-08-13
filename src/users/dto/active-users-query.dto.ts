import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsPositive, Max } from 'class-validator';

export class ActiveUsersQueryDto {
  @ApiProperty({ description: 'Min age', example: 5, required: true })
  @IsPositive()
  @Type(() => Number)
  @IsInt()
  minAge: number;

  @ApiProperty({ description: 'Max age', example: 39, required: true })
  @IsPositive()
  @Max(120)
  @Type(() => Number)
  @IsInt()
  maxAge: number;
}
