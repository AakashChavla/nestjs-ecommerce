// cart.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { CartItem } from './cartItem.entity';

@Entity()
export class Cart {
  // Changed to UUID for consistency across all entities
  @PrimaryGeneratedColumn('uuid')
  id: string;

  // Added JoinColumn and onDelete cascade for proper relation and cleanup
  @ManyToOne(() => User, user => user.carts, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: User;

  // Removed eager loading, added onDelete cascade
  @OneToMany(() => CartItem, item => item.cart, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  items: CartItem[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
