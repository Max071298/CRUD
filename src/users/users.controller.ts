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
import { NotImplementedException } from '@nestjs/common/exceptions';
import { Post } from '@nestjs/common/decorators';
import { FileInterceptor } from '@nestjs/platform-express';
import { type Express } from 'express';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  async getPersonalData(@Request() req) {
    return await this.usersService.findById(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Delete('me')
  async deleteUser(@Request() req) {
    return await this.usersService.deleteUser(req.user.userId);
  }

  @UseGuards(JwtGuard)
  @Patch('me')
  async updateUser(@Request() req, @Body() dto: UpdateUserDto) {
    return await this.usersService.updateUser(req.user.userId, dto);
  }

  @Get('avatars')
  getAvatars() {
    throw new NotImplementedException();
  }

  @UseGuards(JwtGuard)
  @Post('avatars/upload')
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
    console.log(file);
    return await this.usersService.uploadAvatar(req.user.userId, file);
  }

  @UseGuards(JwtGuard)
  @Get(':login')
  async getUsersData(
    @Param('login') login: string,
    @Query() dto: PaginationQueryDto,
  ) {
    const options = { page: dto.page, limit: dto.limit };
    return await this.usersService.paginateByLogin(login, options);
  }
}
