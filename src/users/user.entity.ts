import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { Order } from '../orders/order.entity'; // Adjust path if needed

@Entity()
export class User {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;

    @Column({ unique: true })
    email: string;

    @Column()
    password: string;

    @Column()
    role: string;

    @Column({default: ''})
    profile: string;

    @OneToMany(() => Order, order => order.user)
    orders: Order[];
}
