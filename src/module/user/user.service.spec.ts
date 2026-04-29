import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { I18nService } from 'nestjs-i18n';
import { MailService } from 'src/common/config/mail/mail.service';
import { ConflictException } from 'src/common/exceptions';
import { UserRepository } from './user.repository';
import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let userRepository: jest.Mocked<UserRepository>;
  let mailService: jest.Mocked<MailService>;
  let i18nService: jest.Mocked<I18nService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;

  beforeEach(async () => {
    const mockUserRepository = {
      findByEmail: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      updateFields: jest.fn(),
    };

    const mockMailService = {
      sendVerificationEmail: jest.fn(),
    };

    const mockI18nService = {
      t: jest.fn((key) => key),
    };

    const mockJwtService = {
      sign: jest.fn(),
    };

    const mockConfigService = {
      getOrThrow: jest.fn(),
      get: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserService,
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: MailService, useValue: mockMailService },
        { provide: I18nService, useValue: mockI18nService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<UserService>(UserService);
    userRepository = module.get(UserRepository) as jest.Mocked<UserRepository>;
    mailService = module.get(MailService) as jest.Mocked<MailService>;
    i18nService = module.get(I18nService) as jest.Mocked<I18nService>;
    jwtService = module.get(JwtService) as jest.Mocked<JwtService>;
    configService = module.get(ConfigService) as jest.Mocked<ConfigService>;
  });

  describe('registerUser', () => {
    it('should create a new user and send verification email', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      userRepository.findByEmail.mockResolvedValue(null);
      const mockUser = {
        id: '123',
        email: dto.email,
        name: dto.name,
        emailVerified: false,
      };
      userRepository.create.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue('mock-token');
      configService.getOrThrow.mockReturnValue('secret');
      configService.get.mockReturnValue('http://localhost:8008');
      mailService.sendVerificationEmail.mockResolvedValue(undefined);

      const result = await service.registerUser(dto);

      expect(userRepository.findByEmail).toHaveBeenCalledWith(dto.email);
      expect(userRepository.create).toHaveBeenCalled();
      expect(mailService.sendVerificationEmail).toHaveBeenCalled();
      expect(result.data).toEqual(mockUser);
    });

    it('should throw ConflictException if email already verified', async () => {
      const dto = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'password123',
      };

      const existingUser = {
        id: '123',
        email: dto.email,
        emailVerified: true,
      };

      userRepository.findByEmail.mockResolvedValue(existingUser);
      i18nService.t.mockReturnValue('Email already exists');

      await expect(service.registerUser(dto)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findById', () => {
    it('should return user by id', async () => {
      const userId = '123';
      const mockUser = {
        id: userId,
        email: 'test@example.com',
        name: 'Test User',
      };

      userRepository.findById.mockResolvedValue(mockUser);

      const result = await userRepository.findById(userId);

      expect(result).toEqual(mockUser);
      expect(userRepository.findById).toHaveBeenCalledWith(userId);
    });
  });
});
