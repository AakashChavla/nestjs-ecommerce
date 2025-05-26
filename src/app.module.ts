import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';

// @Module({
//   imports: [UsersModule, AuthModule],
//   controllers: [AppController],
//   providers: [AppService],
// })
// export class AppModule {}

import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './users/user.entity';
import { ProductsModule } from './products/products.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports:[
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database:'data.db',
      entities: [User],
      synchronize: true,
    }),
    UsersModule,
    AuthModule,
    ProductsModule,
    OrdersModule,
  ]
})

export class AppModule{}