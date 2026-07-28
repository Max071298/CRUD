import { Column, Entity, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Avatar } from './avatars.entity';

@Entity('users')
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

  @Column('bigint', { nullable: true })
  updated_at: number;

  @Column('bigint', { nullable: true })
  deleted_at: number;

  @OneToMany(() => Avatar, (avatar) => avatar.user)
  avatars: Avatar[];
}
