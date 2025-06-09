import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
  UpdateDateColumn,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Cart } from '../../cart/entities/cart.entity'; // ✅ Added import
import { Exclude } from 'class-transformer';
import { Review } from '../../reviews/entities/review.entity';
import { Wishlist } from 'src/wishlist/entities/wishlist.entity';
import { Notification } from 'src/notifications/entities/notification.entity';

export enum UserRole {
  ADMIN = 'admin',
  BUSSINESS = 'bussiness',
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

  @Column({ nullable: true })
  mobileNo: string;

  @Exclude()
  @Column()
  password: string;

  @Exclude()
  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CUSTOMER,
  })
  role: UserRole;

  @Column({ nullable: true })
  profile: string;

  @Exclude()
  @Column({ type: 'text', nullable: true })
  token: string | null;

  @Exclude()
  @Column({ default: false })
  isVerified: boolean;

  @Exclude()
  @Column({ type: 'varchar', nullable: true })
  otp: string | null;

  @Exclude()
  @Column({ type: 'timestamp', nullable: true })
  otpSentAt: Date | null;

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlist: Wishlist[];

  @OneToMany(() => Notification, notification => notification.user)
  notifications: Notification[];

}
