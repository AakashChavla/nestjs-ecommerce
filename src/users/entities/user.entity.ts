import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Order } from '../../orders/entities/order.entity';
import { Cart } from '../../cart/entities/cart.entity'; // ✅ Added import
import { Exclude } from 'class-transformer';
import { Review } from '../../reviews/entities/review.entity';
import { Wishlist } from 'src/wishlist/entities/wishlist.entity';

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

  @OneToMany(() => Order, (order) => order.user)
  orders: Order[];

  @OneToMany(() => Cart, (cart) => cart.user)
  carts: Cart[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlist: Wishlist[];

}
