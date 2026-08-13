import { Column, Entity, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

@Entity('avatars')
export class Avatar {
  @PrimaryGeneratedColumn('uuid')
  avatarId: string;

  @Column('text')
  filename: string;

  @Column('bigint', { nullable: true })
  uploaded_at: number;

  @Column('bigint', { nullable: true })
  deleted_at: number;

  @ManyToOne(() => User, (user) => user.avatars, { onDelete: 'CASCADE' })
  user: User;
}
