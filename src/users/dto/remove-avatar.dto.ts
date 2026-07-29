import { IsString } from 'class-validator';

export class RemoveAvatarDto {
  @IsString()
  filename: string;
}
