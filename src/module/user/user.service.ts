import { ConflictException, Injectable } from '@nestjs/common';
import { DatabaseService } from 'src/common';
import { RegisterUserDto } from './dto/register-user.dto';
import { MailService } from 'src/common/mail/mail.service';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UserService {
  constructor(
    private databaseService: DatabaseService,
    private mailService: MailService,
    private i18n: I18nService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async registerUser(dto: RegisterUserDto) {
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
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          emailVerified: true,
          createdAt: true,
        },
      });
    } else if (existingUser && existingUser.emailVerified) {
      // If user exists and email is verified, throw error
      throw new ConflictException(
        this.i18n.t('user.registration.email_exists'),
      );
    } else {
      // Create new user
      user = await this.databaseService.user.create({
        data: {
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          passwordHash,
          emailVerified: false,
          isActive: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
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
      `${user.firstName} ${user.lastName}`,
      verificationUrl,
    );

    return {
      message: this.i18n.t('user.registration.success'),
      data: user,
    };
  }
}
