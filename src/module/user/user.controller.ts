import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserService } from './user.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@ApiTags('User')
@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User registered successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'User with this email already exists and is verified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async register(@Body() registerUserDto: RegisterUserDto) {
    return await this.userService.registerUser(registerUserDto);
  }

  @Post('register-seller')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new seller' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Seller registered successfully',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Seller with this email already exists and is verified',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Validation error',
  })
  async registerSeller(@Body() registerUserDto: RegisterUserDto) {
    return await this.userService.registerSeller(registerUserDto);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify user email using OTP' })
  @ApiBody({ type: VerifyOtpDto })
  @ApiOkResponse({
    description: 'Email verified successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid or expired OTP',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async verifyEmail(@Body() verifyEmailDto: VerifyOtpDto) {
    return await this.userService.verifyEmail(verifyEmailDto);
  }
}
