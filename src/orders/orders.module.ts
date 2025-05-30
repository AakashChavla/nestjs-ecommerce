import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';
import { Product } from '../products/product.entity'; 

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Product]), 
    UsersModule,
    ProductsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
