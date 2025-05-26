// import { Module } from '@nestjs/common';
// import { OrdersService } from './orders.service';
// import { OrdersController } from './orders.controller';
// import { TypeOrmModule } from '@nestjs/typeorm';
// import { Order } from './order.entity';
// @Module({
//   imports: [TypeOrmModule.forFeature([Order])],
//   providers: [OrdersService],
//   controllers: [OrdersController, TypeOrmModule]
// })
// export class OrdersModule {}


import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './order.entity';
import { OrderItem } from './order.entity'; // same file but different classes
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Order, OrderItem])],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
