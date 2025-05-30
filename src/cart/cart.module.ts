import { Module } from '@nestjs/common';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity';
import { CartItem } from './entities/cartItem.entity';
import { UsersModule } from 'src/users/users.module';
import { ProductsModule } from 'src/products/products.module';
import { OrdersModule } from 'src/orders/orders.module';
import { OrdersService } from 'src/orders/orders.service';
import { UsersService } from 'src/users/users.service';
import { ProductsService } from 'src/products/products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Cart, CartItem]),
    UsersModule,
    ProductsModule,
    OrdersModule

  ],
  providers: [CartService, UsersService],
  controllers: [CartController]
})
export class CartModule { }
