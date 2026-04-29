jest.mock('bcrypt');

import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { I18nService } from 'nestjs-i18n';
import { MailService } from 'src/common/config/mail/mail.service';
import { UserRepository } from '../user/user.repository';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;
  let userRepository: jest.Mocked<UserRepository>;
  let _mailService: jest.Mocked<MailService>;
  let i18nService: jest.Mocked<I18nService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockUserRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      updateLastLogin: jest.fn(),
      incrementTokenVersion: jest.fn(),
      markEmailAsVerified: jest.fn(),
      findByIdWithSelect: jest.fn(),
    };

    const mockMailService = {
      sendVerifiedSuccessMail: jest.fn(),
    };

    const mockI18nService = {
      t: jest.fn((key) => key),
    };

    const mockJwtService = {
      verify: jest.fn(),
      signAsync: jest.fn(),
    };

    const mockConfigService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: MailService, useValue: mockMailService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    _mailService = module.get(MailService) as jest.Mocked<MailService>;
    i18nService = module.get(I18nService) as jest.Mocked<I18nService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('login', () => {
    it('should return access and refresh tokens on successful login', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };
      const mockUser = {
        id: '123',
        email: dto.email,
        passwordHash: '$2b$10$...',
        role: UserRole.USER,
        tokenVersion: 1,
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      jwtService.signAsync.mockResolvedValueOnce('mock-access-token');
      jwtService.signAsync.mockResolvedValueOnce('mock-refresh-token');
      configService.getOrThrow.mockReturnValue('secret');
      configService.get.mockReturnValue('15m');
      userRepository.updateLastLogin.mockResolvedValue(undefined);

      const result = await service.login(dto);

      expect(result.data.accessToken).toBeDefined();
      expect(result.data.refreshToken).toBeDefined();
      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(
        dto.password,
        mockUser.passwordHash,
      );
    });

    it('should throw UnauthorizedException if password is incorrect', async () => {
      const dto = { email: 'test@example.com', password: 'wrongpassword' };
      const mockUser = {
        id: '123',
        email: dto.email,
        passwordHash: '$2b$10$...',
        role: UserRole.USER,
        tokenVersion: 1,
      };

      userRepository.findByEmail.mockResolvedValue(mockUser);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      i18nService.t.mockReturnValue('Invalid credentials');

      await expect(service.login(dto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const dto = { email: 'test@example.com', password: 'password123' };

      userRepository.findByEmail.mockResolvedValue(null);
      i18nService.t.mockReturnValue('User not found');

      await expect(service.login(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('logout', () => {
    it('should increment token version on logout', async () => {
      const userId = '123';
      const mockUser = { tokenVersion: 2 };

      userRepository.incrementTokenVersion.mockResolvedValue(mockUser);

      const result = await service.logout(userId);

      expect(userRepository.incrementTokenVersion).toHaveBeenCalledWith(userId);
      expect(result.data.tokenVersion).toBe(2);
    });
  });

  describe('refreshAccessToken', () => {
    it('should return new access token', async () => {
      const userId = '123';
      const tokenVersion = 1;
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        role: UserRole.USER,
        tokenVersion,
      };

      userRepository.findById.mockResolvedValue(mockUser);
      jwtService.signAsync.mockResolvedValueOnce('new-mock-token');
      configService.getOrThrow.mockReturnValue('secret');
      configService.get.mockReturnValue('15m');

      const result = await service.refreshAccessToken(userId, tokenVersion);

      expect(result.data.accessToken).toBeDefined();
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });

    it('should throw UnauthorizedException if token version mismatch', async () => {
      const userId = '123';
      const tokenVersion = 1;
      const mockUser = { tokenVersion: 2 };

      userRepository.findById.mockResolvedValue(mockUser);
      i18nService.t.mockReturnValue('Invalid token');

      await expect(
        service.refreshAccessToken(userId, tokenVersion),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
