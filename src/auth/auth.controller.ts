import {
  Body,
  Controller,
  NotImplementedException,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtGuard } from './jwt.guard';
import { RefreshJwtGuard } from './refresh.guard';
import { SignInUserDto } from 'src/users/dto/signIn-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    return await this.authService.register(dto);
  }

  @Post('signIn')
  async signIn(@Body() dto: SignInUserDto) {
    return this.authService.signIn(dto);
  }

  @UseGuards(JwtGuard)
  @Post('signOut')
  async signOut() {
    throw new NotImplementedException();
  }

  @UseGuards(RefreshJwtGuard)
  @Post('refresh')
  async refresh(@Request() req) {
    return await this.authService.refreshTokens(
      req.user.userId,
      req.user.login,
    );
  }
}
