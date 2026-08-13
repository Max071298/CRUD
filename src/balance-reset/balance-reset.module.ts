import { Module } from '@nestjs/common';
import { BalanceResetController } from './balance-reset.controller';
import { BalanceResetService } from './balance-reset.service';
import { BullModule } from '@nestjs/bullmq';
import { UsersModule } from 'src/users/users.module';
import { BalanceResetConsumer } from './balance-reset.consumer';

@Module({
  imports: [
    UsersModule,
    BullModule.registerQueue({
      name: 'balance-reset',
    }),
  ],
  controllers: [BalanceResetController],
  providers: [BalanceResetService, BalanceResetConsumer],
})
export class BalanceResetModule {}
