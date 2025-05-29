// cart-item.entity.ts
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { Cart } from './cart.entity';
import { Product } from '../../products/product.entity';

@Entity()
@Unique(['cart', 'product']) // Prevent duplicate items in a cart
export class CartItem {
  // Changed to UUID for consistency
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Added JoinColumn and onDelete cascade
  @ManyToOne(() => Cart, cart => cart.items, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Cart;

  // Added reverse relation and onDelete cascade
  @ManyToOne(() => Product, product => product.cartItems, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Product;

  @Column('int', { default: 1 })
  quantity: number;

  @Column('decimal', { precision: 10, scale: 2 })
  unitPrice: number;
}
