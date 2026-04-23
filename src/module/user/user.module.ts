import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommonModule } from 'src/common/common.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Module({
  imports: [JwtModule, CommonModule],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
