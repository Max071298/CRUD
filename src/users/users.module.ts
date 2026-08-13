import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { S3Module } from 'src/providers/files/s3/s3.module';
import { Avatar } from './entities/avatars.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Avatar]), S3Module],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
