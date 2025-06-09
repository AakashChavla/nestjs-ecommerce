import { BadRequestException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user.entity';
import { CommonResponse } from '../template/response';
import { NotificationsService } from 'src/notifications/notifications.service';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,

    private readonly notificationsService: NotificationsService,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  // async create(createUserDto: CreateUserDto): Promise<CommonResponse> {
  //   try {
  //     const { name, email, password, role } = createUserDto;

  //     // Check if email already exists
  //     const existingUser = await this.usersRepository.findOne({ where: { email } });
  //     if (existingUser) {
  //       return {
  //         status: HttpStatus.CONFLICT,
  //         message: 'Email is already registered',
  //       };
  //     }

  //     const hashedPassword = await bcrypt.hash(password, 10);

  //     const user = this.usersRepository.create({
  //       name,
  //       email,
  //       password: hashedPassword,
  //       role: role as UserRole,
  //     });

  //     const savedUser = await this.usersRepository.save(user);

  //     return {
  //       status: HttpStatus.CREATED,
  //       message: 'User registered successfully',
  //       data: savedUser,
  //     };
  //   } catch (error) {
  //     return {
  //       status: HttpStatus.INTERNAL_SERVER_ERROR,
  //       message: 'Error registering user',
  //       error: error.message,
  //     };
  //   }
  // }

  async create(createUserDto: CreateUserDto): Promise<CommonResponse> {
    try {
      const { name, email, password, role, mobileNo } = createUserDto;

      // Check if email already exists
      const existingUser = await this.usersRepository.findOne({ where: { email } });
      const hashedPassword = await bcrypt.hash(password, 10);
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpSentAt = new Date();

      if (existingUser) {
        if (existingUser.isVerified) {
          return {
            status: HttpStatus.CONFLICT,
            message: 'Email is already registered',
          };
        } else {
          // Update existing unverified user
          existingUser.name = name;
          existingUser.password = hashedPassword;
          existingUser.role = role as UserRole;
          existingUser.otp = otp;
          existingUser.otpSentAt = otpSentAt;
          existingUser.mobileNo = mobileNo ?? '';

          const savedUser = await this.usersRepository.save(existingUser);
          await this.notificationsService.sendOtp(email, otp);

          // Hide sensitive fields
          const { password: _password, otp: _otp, otpSentAt: _otpSentAt, role: _role, token, ...safeUser } = savedUser;

          return {
            status: HttpStatus.OK,
            message: 'OTP resent. Please verify your email.',
            data: safeUser,
          };
        }
      }

      // Create new user if not exists
      const user = this.usersRepository.create({
        name,
        email,
        password: hashedPassword,
        role: role as UserRole,
        otp,
        otpSentAt,
        isVerified: false,
        mobileNo: mobileNo ?? '',
      });

      const savedUser = await this.usersRepository.save(user);

      // Send OTP mail
      await this.notificationsService.sendOtp(email, otp);

      // Hide sensitive fields
      const { password: _password, otp: _otp, otpSentAt: _otpSentAt, role: _role, token, ...safeUser } = savedUser;

      return {
        status: HttpStatus.CREATED,
        message: 'User registered successfully. OTP sent to email.',
        data: safeUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error registering user',
        error: error.message,
      };
    }
  }

  async findOneByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
    profileFilename?: string,
  ): Promise<CommonResponse> {
    try {
      // Make a shallow copy, but exclude 'role' for now
      const { role, ...rest } = updateUserDto;

      const updateData: Partial<User> = { ...rest };

      if (profileFilename) {
        updateData.profile = profileFilename;
      }

      if (role) {

        const roleKey = role.toUpperCase() as keyof typeof UserRole;
        if (UserRole[roleKey]) {
          updateData.role = UserRole[roleKey];
        } else {
          return {
            status: HttpStatus.BAD_REQUEST,
            message: 'Invalid role value',
          };
        }
      }

      // Email uniqueness check if email is present
      if (updateData.email) {
        const existingUser = await this.usersRepository.findOne({ where: { email: updateData.email } });
        if (existingUser && existingUser.id !== id) {
          return {
            status: HttpStatus.CONFLICT,
            message: 'Email is already in use by another user',
          };
        }
      }

      const updateResult = await this.usersRepository.update(id, updateData);

      if (updateResult.affected === 0) {
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'User not found',
        };
      }

      const updatedUser = await this.usersRepository.findOne({ where: { id } });

      return {
        status: HttpStatus.OK,
        message: 'User updated successfully',
        data: updatedUser,
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error updating user',
        error: error.message,
      };
    }
  }



  async remove(id: string): Promise<void> {
    await this.usersRepository.delete(id);
  }

  async updateToken(id: string, token: string): Promise<void> {
    await this.usersRepository.update(id, { token });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { id } });
  }



  async DeleteUser(id: string, deleteUserId: string): Promise<{ status: number; message: string; error?: string, targetUser?: User }> {
    try {
      const user = await this.usersRepository.findOne({ where: { id } });
      if (!user || user.role !== 'admin') {
        return {
          status: HttpStatus.UNAUTHORIZED,
          message: 'User not found or not authorized to delete this user',
        };
      }

      const targetUser = await this.usersRepository.findOne({ where: { id: deleteUserId } });
      if (!targetUser) {
        return {
          status: HttpStatus.NOT_FOUND,
          message: 'Target user to delete not found',
        };
      }

      await this.usersRepository.delete(deleteUserId);

      return {
        status: HttpStatus.OK,
        message: 'User deleted successfully',
        targetUser: targetUser
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error deleting user',
        error: error.message,
      };
    }
  }

  async verifyOtp(userId: string, otp: string): Promise<CommonResponse> {
    try {
      const user = await this.usersRepository.findOne({ where: { id: userId } });
      if (!user || !user.otp || !user.otpSentAt) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'OTP not found or not sent',
        };
      }

      // Check OTP expiry (5 minutes)
      const now = new Date();
      const sentAt = new Date(user.otpSentAt);
      const diffMs = now.getTime() - sentAt.getTime();
      const diffMinutes = diffMs / (1000 * 60);

      if (diffMinutes > 5) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'OTP expired',
        };
      }

      // Check OTP match
      if (user.otp !== otp) {
        return {
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid OTP',
        };
      }

      // Mark user as verified and clear OTP fields
      user.isVerified = true;
      user.otp = null;
      user.otpSentAt = null;
      await this.usersRepository.save(user);

      return {
        status: HttpStatus.OK,
        message: 'OTP verified and user is now verified.',
      };
    } catch (error) {
      return {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Error verifying OTP',
        error: error.message,
      };
    }
  }

}
