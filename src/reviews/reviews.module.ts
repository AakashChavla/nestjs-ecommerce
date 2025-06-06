import { forwardRef, Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { Product } from '../products/entities/product.entity';
import { User } from '../users/entities/user.entity';
import { UsersModule } from '../users/users.module';
import { ProductsModule } from '../products/products.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Review, Product, User,]),
    forwardRef(() => UsersModule),
    forwardRef(() => ProductsModule)
  ],
  providers: [ReviewsService],
  controllers: [ReviewsController],
})
export class ReviewsModule { }
