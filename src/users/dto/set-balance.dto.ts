import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsPositive, IsString } from 'class-validator';

export class SetBalanceDto {
  @ApiProperty({ description: 'Login', example: 'test123', required: true })
  @IsString()
  login: string;

  @ApiProperty({
    description: 'Amount on balance account',
    example: 50,
    required: true,
  })
  @Type(() => Number)
  @IsPositive()
  amount: number;
}
