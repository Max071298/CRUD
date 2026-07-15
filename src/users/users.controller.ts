import {
  Controller,
  Get,
  NotImplementedException,
  Param,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtGuard } from 'src/auth/jwt.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtGuard)
  @Get('me')
  async getPersonalData(@Request() req) {
    return this.usersService.findById(req.user.userId);
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
