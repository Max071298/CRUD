import { Type } from 'class-transformer';
import { IsPositive, IsString } from 'class-validator';

export class SetBalanceDto {
  @IsString()
  login: string;

  @Type(() => Number)
  @IsPositive()
  amount: number;
}
