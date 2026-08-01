import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  Request,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from 'src/auth/guards/jwt.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';
import { Post, HttpCode } from '@nestjs/common/decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Express } from 'express';
import { RemoveAvatarDto } from './dto/remove-avatar.dto';
import { ActiveUsersQueryDto } from './dto/active-users-query.dto';
import { MakeMoneyTransferDto } from './dto/make-money-transfer.dto';
import { SetBalanceDto } from './dto/set-balance.dto';

@UseGuards(JwtGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getPersonalData(@Request() req) {
    return await this.usersService.findById(req.user.userId);
  }

  @Delete('me')
  async deleteUser(@Request() req) {
    return await this.usersService.deleteUser(req.user.userId);
  }

  @Patch('me')
  async updateUser(@Request() req, @Body() dto: UpdateUserDto) {
    return await this.usersService.updateUser(req.user.userId, dto);
  }

  @Post('me/transfer')
  @HttpCode(200)
  async makeMoneyTransfer(@Request() req, @Body() dto: MakeMoneyTransferDto) {
    return await this.usersService.makeMoneyTransfer(
      req.user.userId,
      dto.receiver,
      dto.amount,
    );
  }

  @Get('active')
  async getActiveUsers(@Query() dto: ActiveUsersQueryDto) {
    return await this.usersService.getActiveUsers(dto);
  }

  @Delete('me/avatars/remove')
  async removeAvatar(@Request() req, @Body() dto: RemoveAvatarDto) {
    return await this.usersService.removeAvatar(req.user.userId, dto.filename);
  }

  @Post('me/avatars/upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({ fileType: /^image\/(png|jpeg)$/ })
        .addMaxSizeValidator({ maxSize: 1024 * 1024 })
        .build({ errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY }),
    )
    file: Express.Multer.File,
    @Request() req,
  ) {
    return await this.usersService.uploadAvatar(req.user.userId, file);
  }

  @Post('set-balance')
  async setBalance(@Body() dto: SetBalanceDto) {
    return await this.usersService.setBalance(dto);
  }

  @Get(':login')
  async getUsersData(
    @Param('login') login: string,
    @Query() dto: PaginationQueryDto,
  ) {
    const options = { page: dto.page, limit: dto.limit };
    return await this.usersService.paginateByLogin(login, options);
  }
}
