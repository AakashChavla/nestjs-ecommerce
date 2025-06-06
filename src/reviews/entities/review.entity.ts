import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Product } from '../../products/entities/product.entity';

@Entity()
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    rating: number;

    @Column()
    comment: string;

    @ManyToOne(() => User, user => user.reviews)
    user: User;

    @ManyToOne(() => Product, product => product.reviews)
    product: Product;
    
    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

}