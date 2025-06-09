import {Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity'

@Entity()
export class Wishlist {
    @PrimaryGeneratedColumn('uuid')
    id:string;

    @ManyToOne(()=> User, user => user.wishlist)
    user: User;

    @ManyToOne(()=> Product, product => product.wishlist)
    product: Product;

    @CreateDateColumn()
    createAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}