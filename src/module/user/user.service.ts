import { ConflictException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { DatabaseService } from 'src/common';
import { MailService } from 'src/common/mail/mail.service';
import { RegisterSellerDto } from './dto/register-seller.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Injectable()
export class UserService {
  constructor(
    private databaseService: DatabaseService,
    private mailService: MailService,
    private i18n: I18nService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async registerAccount(
    dto: RegisterUserDto | RegisterSellerDto,
    role: UserRole,
    successMessageKey: string,
  ) {
    // Check if user already exists
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: dto.email },
    });

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    let user;

    // If user exists but email is not verified, allow re-registration
    if (existingUser && !existingUser.emailVerified) {
      // Update existing user data
      user = await this.databaseService.user.update({
        where: { id: existingUser.id },
        data: {
          name: dto.name,
          role,
          passwordHash,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    } else if (existingUser?.emailVerified) {
      // If user exists and email is verified, throw error
      throw new ConflictException(
        this.i18n.t('user.registration.email_exists'),
      );
    } else {
      // Create new user
      user = await this.databaseService.user.create({
        data: {
          email: dto.email,
          name: dto.name,
          role,
          passwordHash,
          emailVerified: false,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    }

    // Generate email verification token (expires in 24 hours)
    const verificationToken = this.jwtService.sign(
      { email: user.email, userId: user.id, type: 'email-verification' },
      {
        expiresIn: '24h',
        secret: this.configService.get('JWT_ACCESS_SECRET_TOKEN'),
      },
    );

    // Create verification URL
    const baseUrl =
      this.configService.get('APP_URL') || 'http://localhost:8008';
    const verificationUrl = `${baseUrl}/api/v1/auth/verify-email/${verificationToken}`;

    // Send verification email
    await this.mailService.sendVerificationEmail(
      user.email,
      user.name ?? dto.name,
      verificationUrl,
    );

    return {
      message: this.i18n.t(successMessageKey),
      data: user,
    };
  }

  async registerUser(dto: RegisterUserDto) {
    return await this.registerAccount(
      dto,
      UserRole.USER,
      'user.registration.success',
    );
  }

  async registerSeller(dto: RegisterSellerDto) {
    return await this.registerAccount(
      dto,
      UserRole.SELLER,
      'user.registration.seller_success',
    );
  }
}
