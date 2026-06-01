import { Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { MailService } from 'src/common/config/mail/mail.service';
import {
  BusinessException,
  ConflictException,
  NotFoundException,
} from 'src/common/exceptions';
import { RegisterUserDto } from './dto/register-user.dto';
import { UserRepository } from './user.repository';
import { generateOtp } from 'src/common/helpers/otp.helper';
import { RedisService } from 'src/common/config/redis/redis.service';
import { VerifyOtpDto } from './dto/verify-otp.dto';

@Injectable()
export class UserService {
  constructor(
    private userRepository: UserRepository,
    private mailService: MailService,
    private i18n: I18nService,
    private redisService: RedisService,
  ) {}

  private async registerAccount(
    dto: RegisterUserDto,
    role: UserRole,
    successMessageKey: string,
  ) {
    const existingUser = await this.userRepository.findByEmail(dto.email);

    // Guard first — avoid hashing password if we're going to throw anyway
    if (existingUser?.emailVerified) {
      throw new ConflictException(
        this.i18n.t('user.registration.email_exists'),
        'EMAIL_ALREADY_EXISTS',
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = existingUser
      ? await this.userRepository.updateFields(existingUser.id, {
          name: dto.name,
          role,
          passwordHash,
          isActive: true,
        })
      : await this.userRepository.create({
          email: dto.email,
          name: dto.name,
          role,
          passwordHash,
          emailVerified: false,
          isActive: true,
        });

    const otp = generateOtp(6);
    const userEmail = user.email ?? dto.email;
    const userName = user.name ?? dto.name;

    // Store OTP before sending the email — prevents the user
    // receiving an OTP they can never verify if Redis write fails
    await this.redisService.set(`otp_register:${user.email}`, otp, 15 * 60);
    await this.mailService.sendOtp(userEmail, userName, otp);

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

  async verifyEmail(dto: VerifyOtpDto) {
    const { email, otp } = dto;

    const user = await this.userRepository.findByEmail(email);
    if (!user) {
      throw new NotFoundException(
        this.i18n.t('user.verification.user_not_found'),
        'USER_NOT_FOUND',
      );
    }

    if (user.emailVerified) {
      return {
        message: this.i18n.t('user.verification.already_verified'),
        data: { emailVerified: true },
      };
    }

    const storedOtp = await this.redisService.get(`otp_register:${email}`);
    if (!storedOtp) {
      throw new BusinessException(
        this.i18n.t('user.verification.otp_expired'),
        'OTP_EXPIRED',
      );
    }

    if (storedOtp !== otp) {
      throw new BusinessException(
        this.i18n.t('user.verification.otp_invalid'),
        'OTP_INVALID',
      );
    }

    // DB write and Redis cleanup are independent — run in parallel
    await Promise.all([
      this.userRepository.markEmailAsVerified(user.id),
      this.redisService.del(`otp_register:${email}`),
    ]);

    // Success email is non-critical — fire and forget, don't block the response
    this.mailService
      .sendVerifiedSuccessMail(user.email, user.name ?? user.email)
      .catch((err) =>
        console.error('Failed to send verification success email', err),
      );

    return {
      message: this.i18n.t('user.verification.success'),
      data: { emailVerified: true },
    };
  }
}
