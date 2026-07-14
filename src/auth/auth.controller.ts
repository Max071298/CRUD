import {
  Body,
  Controller,
  NotImplementedException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { JwtGuard } from './jwt.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() dto: CreateUserDto) {
    throw new NotImplementedException();
  }

  @Post('signIn')
  async signIn() {
    throw new NotImplementedException();
  }

  @UseGuards(JwtGuard)
  @Post('signOut')
  async signOut() {
    throw new NotImplementedException();
  }
}
