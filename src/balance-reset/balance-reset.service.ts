import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';

@Injectable()
export class BalanceResetService implements OnModuleInit {
  private readonly logger = new Logger(BalanceResetService.name);
  constructor(@InjectQueue('balance-reset') private balanceResetQueue: Queue) {}

  async onModuleInit() {
    try {
      await this.balanceResetQueue.upsertJobScheduler(
        'balance-reset-10m-scheduler',
        {
          every: 1000 * 60 * 10,
        },
        {
          name: 'schedule-reset-balances',
        },
      );
      this.logger.log('Job @schedule-reset-balances successfully added');
    } catch (err) {
      this.logger.error(
        'Error during Job @schedule-reset-balances adding',
        err instanceof Error ? err.message : err,
      );

      throw err;
    }
  }

  async resetBalances() {
    try {
      await this.balanceResetQueue.add('reset-balances', {});
      this.logger.log('Job @reset-balances successfully added');
    } catch (err) {
      this.logger.error(
        'Fail to add job @reset-balances',
        err instanceof Error ? err.stack : err,
      );

      throw err;
    }
  }
}
