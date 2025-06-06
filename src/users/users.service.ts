import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcrypt';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserRole } from './entities/user.entity';
import { CommonResponse } from '../template/response';


@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) { }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepository.findOne({ where: { email } });
  }

  async create(createUserDto: CreateUserDto): Promise<CommonResponse> {
    try {
      const { name, email, password, role } = createUserDto;

      // Check if email already exists
      const existingUser = await this.usersRepository.findOne({ where: { email } });
      if (existingUser) {
        return {
          status: HttpStatus.CONFLICT,
          message: 'Email is already registered',
        };
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = this.usersRepository.create({
        name,
        email,
        password: hashedPassword,
        role: role as UserRole,
      });

      const savedUser = await this.usersRepository.save(user);

      return {
        status: HttpStatus.CREATED,
        message: 'User registered successfully',
        data: savedUser,
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

}
