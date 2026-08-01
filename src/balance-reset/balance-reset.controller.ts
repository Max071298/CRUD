import { Controller, Post, UseGuards } from '@nestjs/common';
import { BalanceResetService } from './balance-reset.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';

@UseGuards(JwtGuard)
@Controller('balance-reset')
export class BalanceResetController {
  constructor(private balanceResetService: BalanceResetService) {}
  @Post()
  async resetBalances() {
    return await this.balanceResetService.resetBalances();
  }
}
