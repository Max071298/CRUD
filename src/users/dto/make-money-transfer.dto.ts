import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEmail, IsPositive } from 'class-validator';

export class MakeMoneyTransferDto {
  @ApiProperty({
    description: 'email of money receiver',
    example: 'test@example.com',
    required: true,
  })
  @IsEmail()
  receiver: 'string';

  @ApiProperty({
    description: 'transfer amount',
    example: 10.25,
    required: true,
  })
  @Type(() => Number)
  @IsPositive()
  amount: number;
}
