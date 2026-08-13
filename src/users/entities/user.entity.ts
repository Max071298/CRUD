import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Avatar } from './avatars.entity';
import { Min } from 'class-validator';
import { Check } from 'typeorm/decorator/Check.js';

@Entity('users')
@Check(`"balance" >= 0`)
export class User {
  @PrimaryGeneratedColumn('uuid')
  userId: string;

  @Column('text')
  login: string;

  @Column('text')
  email: string;

  @Column('text')
  password: string;

  @Column('integer')
  age: number;

  @Column('text')
  description: string;

  @Column({ type: 'numeric', precision: 200, scale: 2, default: 0 })
  @Min(0, { message: 'Balance must be a positive or zero value' })
  balance: number;

  @Column('bigint', { nullable: true })
  updated_at: number;

  @Column('bigint', { nullable: true })
  deleted_at: number;

  @OneToMany(() => Avatar, (avatar) => avatar.user)
  avatars: Avatar[];
}
