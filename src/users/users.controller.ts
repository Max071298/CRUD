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
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from 'src/auth/jwt.guard';
import { UpdateUserDto } from './dto/update-user.dto';

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

  @UseGuards(JwtGuard)
  @Get(':login')
  async getUsersData(
    @Param('login') login: string,
    @Query('limit') limit: number,
    @Query('page') page: number,
  ) {
    return await this.usersService.filterByLogin(login, limit, page);
  }
}
