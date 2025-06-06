import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { OrderItem } from './order-item.entity';
import { OrderStatus } from './order-status.enum';


@Entity()
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.orders, { nullable: false })
  @JoinColumn({ name: 'userId' })// which id we have to write here?
  user: User;

  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.Placed,
  })
  status: OrderStatus;

  @Column('decimal', { precision: 10, scale: 2 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToMany(() => OrderItem, item => item.order, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  items: OrderItem[];
}
