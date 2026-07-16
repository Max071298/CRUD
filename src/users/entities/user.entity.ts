import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('user')
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

  @Column('integer', { nullable: true })
  updated_at: number;

  @Column('integer', { nullable: true })
  deleted_at: number;
}
