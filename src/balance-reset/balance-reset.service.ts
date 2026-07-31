import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class BalanceResetService implements OnModuleInit {
  constructor(@InjectQueue('balance-reset') private balanceResetQueue: Queue) {}

  async onModuleInit() {
    await this.balanceResetQueue.drain();

    await this.balanceResetQueue.add('schedule-reset-balances', {
      repeat: {
        cron: '*/10 * * * *',
      },
    });
  }

  async resetBalances() {
    await this.balanceResetQueue.add('reset-balances', {});
  }
}
