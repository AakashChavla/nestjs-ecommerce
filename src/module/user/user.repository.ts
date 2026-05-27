/**
 * User Repository
 * Data access layer for User model
 * Encapsulates all Prisma queries related to users
 */

import { Injectable } from '@nestjs/common';
import { User, UserRole } from '@prisma/client';
import { DatabaseService } from 'src/common';

@Injectable()
export class UserRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Find user by email
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.databaseService.user.findUnique({
      where: { email },
    });
  }

  /**
   * Find user by id
   */
  async findById(id: string): Promise<User | null> {
    return this.databaseService.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by id with select fields
   */
  async findByIdWithSelect(
    id: string,
    select: { [key: string]: boolean },
  ): Promise<Partial<User> | null> {
    return this.databaseService.user.findUnique({
      where: { id },
      select,
    });
  }

  /**
   * Create a new user
   */
  async create(data: {
    email: string;
    name: string;
    role: UserRole;
    passwordHash: string;
    emailVerified?: boolean;
    isActive?: boolean;
  }): Promise<Partial<User>> {
    return this.databaseService.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        passwordHash: data.passwordHash,
        emailVerified: data.emailVerified ?? false,
        isActive: data.isActive ?? true,
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

  /**
   * Update user
   */
  async update(id: string, data: Partial<User>): Promise<Partial<User>> {
    return this.databaseService.user.update({
      where: { id },
      data,
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

  /**
   * Update user fields
   */
  async updateFields(
    id: string,
    fields: {
      name?: string;
      role?: UserRole;
      passwordHash?: string;
      isActive?: boolean;
      emailVerified?: boolean;
    },
  ): Promise<Partial<User>> {
    return this.databaseService.user.update({
      where: { id },
      data: fields,
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

  /**
   * Mark email as verified
   */
  async markEmailAsVerified(userId: string): Promise<User> {
    return this.databaseService.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }

  /**
   * Update last login timestamp
   */
  async updateLastLogin(userId: string): Promise<void> {
    await this.databaseService.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  }

  /**
   * Increment token version (for logout)
   */
  async incrementTokenVersion(userId: string): Promise<User> {
    return this.databaseService.user.update({
      where: { id: userId },
      data: {
        tokenVersion: {
          increment: 1,
        },
      },
    });
  }
}
