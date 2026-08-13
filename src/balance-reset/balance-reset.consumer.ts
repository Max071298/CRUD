import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { UsersService } from 'src/users/users.service';

@Processor('balance-reset')
export class BalanceResetConsumer extends WorkerHost {
  constructor(private usersService: UsersService) {
    super();
  }
  async process(job: Job): Promise<any> {
    if (
      job.name === 'reset-balances' ||
      job.name === 'schedule-reset-balances'
    ) {
      await this.usersService.resetBalances();
    }
  }
}
