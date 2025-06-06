import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  UseGuards,
  Patch,
  Req,
  Delete,
  UseInterceptors,
  ParseIntPipe,
  UploadedFile,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { AuthService } from '../auth/auth.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/jwt.auth.guard';
import { User } from './entities/user.entity';
import { UnauthorizedException } from '@nestjs/common/exceptions/unauthorized.exception';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly authService: AuthService,
  ) {}

  @Post('register')
  async register(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Post('login')
  async login(@Body() body: { email: string; password: string }) {
    return this.authService.login(body.email, body.password);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('profile', {
      storage: diskStorage({
        destination: './uploads/profile',
        filename: (req, file, cb) => {
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const ext = extname(file.originalname);
          cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
        },
      }),
    }),
  )
  async updateProfile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: any,
) {
    if (!req.user || !req.user.id) {
      throw new UnauthorizedException('Unauthorized to update this user');
    }
    
    return this.usersService.update(req.user.id, updateUserDto, file?.filename);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  async deleteProfile(@Req() req: Request) {
    const user = req.user;
    if (!user) {
      throw new UnauthorizedException('User not found in request');
    }
    await this.usersService.remove(user.id);
  }


  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async deleteUser(
    @Param('id') id: string,
    @Req() req: Request) {
    if (!req.user) {
      throw new UnauthorizedException('Unauthorized to delete this user');
    }
    return this.usersService.DeleteUser( req.user.id , id);
  }
}
