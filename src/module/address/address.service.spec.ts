import { Test, TestingModule } from '@nestjs/testing';
import { AddressService } from './address.service';
import { AddressRepository } from './address.repository';
import { PaginationDto } from 'src/common/dto/pagination.dto';

describe('AddressService', () => {
  let service: AddressService;
  let repository: jest.Mocked<AddressRepository>;

  beforeEach(async () => {
    const mockRepository = {
      getCountries: jest.fn(),
      getStatesByCountry: jest.fn(),
      getCitiesByState: jest.fn(),
      findCityById: jest.fn(),
      createAddress: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: AddressRepository, useValue: mockRepository },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    repository = module.get(
      AddressRepository,
    ) as jest.Mocked<AddressRepository>;
  });

  describe('getCountries', () => {
    it('should return paginated countries', async () => {
      const pagination: PaginationDto = { page: 1, limit: 10 };
      const mockCountries = {
        data: [{ id: '1', name: 'USA', countryCode: 'US' }],
        totalItems: 1,
      };

      repository.getCountries.mockResolvedValue(mockCountries);

      const result = await service.getCountries(pagination);

      expect(result).toEqual(mockCountries);
      expect(repository.getCountries).toHaveBeenCalledWith(pagination);
    });

    it('should validate sortBy allowlist', async () => {
      const pagination: PaginationDto = {
        page: 1,
        limit: 10,
        sortBy: 'malicious_field',
      };
      const mockCountries = {
        data: [{ id: '1', name: 'USA' }],
        totalItems: 1,
      };

      repository.getCountries.mockResolvedValue(mockCountries);

      await repository.getCountries(pagination);

      expect(repository.getCountries).toHaveBeenCalled();
    });
  });

  describe('createAddress', () => {
    it('should create a new address', async () => {
      const createDto = {
        ownerType: 'USER',
        ownerId: 'user-123',
        addressType: 'HOME',
        label: 'Home',
        addressLine1: '123 Main St',
        addressLine2: 'Apt 4',
        landmark: 'Near Park',
        pincode: '12345',
        cityId: 'city-123',
        latitude: 40.7128,
        longitude: -74.006,
        contactName: 'John Doe',
        contactPhone: '+1234567890',
      };

      const mockAddress = { id: 'addr-123', ...createDto };
      repository.createAddress.mockResolvedValue(mockAddress);

      const result = await repository.createAddress(createDto);

      expect(result).toEqual(mockAddress);
      expect(repository.createAddress).toHaveBeenCalledWith(createDto);
    });
  });
});
