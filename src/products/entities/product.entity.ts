import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Category } from './category.entity';
import { User } from '../../users/entities/user.entity';
import { CartItem } from '../../cart/entities/cartItem.entity';
import { Review } from '../../reviews/entities/review.entity';
import { Wishlist } from 'src/wishlist/entities/wishlist.entity';

@Entity()
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column('text')
  description: string;

  @Column('decimal', { precision: 10, scale: 2 })
  price: number;

  @Column()
  sku: string;

  @Column()
  quantity: number;

  // Optional: link to user who created the product
  @ManyToOne(() => User, (user) => user.id, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'userId' })
  user: User;

  @Column({ nullable: true })
  userId: string;

  @ManyToOne(() => Category, (category) => category.products, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'categoryId' })
  category: Category;

  @Column({ nullable: true })
  categoryId: string;


  @OneToMany(() => CartItem, (cartItem) => cartItem.product)
  cartItems: CartItem[];

  @OneToMany(() => Review, review => review.product)
  reviews: Review[];

  @OneToMany(() => Wishlist, wishlist => wishlist.product)
  wishlist: Wishlist[];

}
