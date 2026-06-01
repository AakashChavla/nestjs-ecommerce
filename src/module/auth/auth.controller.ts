import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBearerAuth,
  ApiBody,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/access-token.guard';
import { JwtRefreshGuard } from './guards/refresh-token.guard';
import { CurrentUser } from './decorator/current-user.decorator';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({
    description: 'Login successful',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid credentials',
  })
  @ApiNotFoundResponse({
    description: 'User not found',
  })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'User logout' })
  @ApiOkResponse({
    description: 'Logout successful',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired token',
  })
  async logout(@CurrentUser('userId') userId: string) {
    return this.authService.logout(userId);
  }

  @Post('refresh-token')
  @UseGuards(JwtRefreshGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Generate new access token from refresh token' })
  @ApiOkResponse({
    description: 'Access token generated successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired refresh token',
  })
  async refreshToken(
    @CurrentUser('userId') userId: string,
    @CurrentUser('tokenVersion') tokenVersion: number,
  ) {
    return this.authService.refreshAccessToken(userId, tokenVersion);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({
    description: 'Profile retrieved successfully',
  })
  @ApiUnauthorizedResponse({
    description: 'Invalid or expired access token',
  })
  async getMyProfile(@CurrentUser('userId') userId: string) {
    return this.authService.getMyProfile(userId);
  }
}
