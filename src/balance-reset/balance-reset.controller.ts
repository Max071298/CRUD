import { Controller, Post } from '@nestjs/common';
import { BalanceResetService } from './balance-reset.service';

@Controller('balance-reset')
export class BalanceResetController {
  constructor(private balanceResetService: BalanceResetService) {}
  @Post()
  async resetBalances() {
    await this.balanceResetService.resetBalances();
  }
}
