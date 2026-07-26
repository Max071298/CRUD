import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsPositive } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({ description: 'The page number', example: 1, required: true })
  @Type(() => Number)
  @IsPositive()
  page: number;

  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    required: true,
  })
  @Type(() => Number)
  @IsPositive()
  limit: number;
}
