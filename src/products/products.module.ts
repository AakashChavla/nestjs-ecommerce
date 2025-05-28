import { Module } from '@nestjs/common';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product } from './product.entity';
import { Category } from './category.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/user.entity'

@Module({
  imports: [TypeOrmModule.forFeature([Product, Category, User])],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService],
})
export class ProductsModule {}
