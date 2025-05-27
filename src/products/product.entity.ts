import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from "typeorm";
import {Category} from './category.entity';
import { UUID } from "typeorm/driver/mongodb/bson.typings";

@Entity()
export class Product{
    @PrimaryGeneratedColumn("uuid")
    id: string;

    @Column()
    name: string

    @Column('text')
    description: string;

    @Column('decimal')
    price: number;

    @Column()
    sku: string;

    @Column()
    quantity: number;

    @ManyToOne(()=> Category, category => category.products)
    category: Category;
}