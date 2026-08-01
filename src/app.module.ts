import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ConfigModule } from '@nestjs/config';
import { JwtStrategy } from './auth/strategies/jwt.strategy';
import { TypeOrmModule } from '@nestjs/typeorm';
import { dataSourceOptions } from './database/data-source';
import { S3Module } from './providers/files/s3/s3.module';
import { CacheModule } from '@nestjs/cache-manager';
import KeyvRedis from '@keyv/redis';
import { addTransactionalDataSource } from 'typeorm-transactional';
import { DataSource } from 'typeorm/data-source/DataSource.js';
import { BullModule } from '@nestjs/bullmq';
import { BalanceResetModule } from './balance-reset/balance-reset.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => {
        return {
          ...dataSourceOptions,
          autoLoadEntities: true,
        };
      },

      dataSourceFactory(options) {
        if (!options) throw new Error('Invalid options passed');
        return Promise.resolve(
          addTransactionalDataSource(new DataSource(options)),
        );
      },
    }),
    AuthModule,
    UsersModule,
    S3Module,
    CacheModule.register({
      isGlobal: true,
      ttl: 30000,
      stores: [
        new KeyvRedis({
          url: 'redis://localhost:6379',
          password: process.env.REDIS_PASSWORD,
        }),
      ],
    }),
    BullModule.forRoot({
      connection: {
        host: 'localhost',
        port: Number(process.env.REDIS_PORT),
        password: process.env.REDIS_PASSWORD,
      },
    }),
    BalanceResetModule,
  ],
  controllers: [AppController],
  providers: [AppService, JwtStrategy],
})
export class AppModule {}
