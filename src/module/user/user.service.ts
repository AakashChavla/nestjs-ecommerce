import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { MailService } from 'src/common/config/mail/mail.service';
import { ConflictException } from 'src/common/exceptions';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserRepository } from './user.repository';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private mailService: MailService,
    private i18n: I18nService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private async registerAccount(
    dto: RegisterUserDto,
    role: UserRole,
    successMessageKey: string,
  ) {
    // Check if user already exists
    const existingUser = await this.userRepository.findByEmail(dto.email);

    // Hash the password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(dto.password, saltRounds);

    let user;

    // If user exists but email is not verified, allow re-registration
    if (existingUser && !existingUser.emailVerified) {
      // Update existing user data
      user = await this.userRepository.updateFields(existingUser.id, {
        name: dto.name,
        role,
        passwordHash,
        isActive: true,
      });
    } else if (existingUser?.emailVerified) {
      // If user exists and email is verified, throw error
      throw new ConflictException(
        this.i18n.t('user.registration.email_exists'),
        'EMAIL_ALREADY_EXISTS',
      );
    } else {
      // Create new user
      user = await this.userRepository.create({
        email: dto.email,
        name: dto.name,
        role,
        passwordHash,
        emailVerified: false,
        isActive: true,
      });
    }

    // Generate email verification token (expires in 24 hours)
    const verificationToken = this.jwtService.sign(
      { email: user.email, userId: user.id, type: 'email-verification' },
      {
        expiresIn: '24h',
        secret: this.configService.getOrThrow<string>(
          'JWT_VERIFICATION_SECRET_TOKEN',
        ),
      },
    );

    // Create verification URL
    const baseUrl =
      this.configService.get('APP_URL') || 'http://localhost:8008';
    const verificationUrl = `${baseUrl}/api/v1/auth/verify-email/${verificationToken}`;

    // Send verification email
    const userEmail = user.email || dto.email;
    const userName = user.name ?? dto.name;
    await this.mailService.sendVerificationEmail(
      userEmail,
      userName,
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

  async registerSeller(dto: RegisterUserDto) {
    return await this.registerAccount(
      dto,
      UserRole.SELLER,
      'user.registration.seller_success',
    );
  }
}
