import {
  Body,
  Controller,
  NotImplementedException,
  Post,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/users/dto/create-user.dto';

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

  @Post('signOut')
  async signOut() {
    throw new NotImplementedException();
  }
}
