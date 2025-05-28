import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../orders/order.entity';

export enum UserRole {
  ADMIN = 'admin',
  CUSTOMER = 'customer',
  // Add more roles if needed
}

@Entity()
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ default: '' })
  name: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ nullable: true })
  profile: string;

  @Column({ type: 'text', nullable: true })
  token: string | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];
}
