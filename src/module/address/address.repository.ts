/**
 * Address Repository
 * Data access layer for Address model and related entities
 * Encapsulates all Prisma queries related to addresses
 */

import { Injectable } from '@nestjs/common';
import { Address } from '@prisma/client';
import { DatabaseService } from 'src/common';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateAddressDto } from './dto/create-address.dto';

const COUNTRY_ALLOWED_SORT_FIELDS = ['name', 'countryCode', 'createdAt'];
const STATE_ALLOWED_SORT_FIELDS = ['name', 'stateCode', 'createdAt'];
const CITY_ALLOWED_SORT_FIELDS = ['name', 'cityCode', 'createdAt'];

@Injectable()
export class AddressRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  /**
   * Get all countries with pagination and search
   */
  async getCountries(pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = pagination.search?.trim();
    const sortBy = (
      COUNTRY_ALLOWED_SORT_FIELDS.includes(pagination.sortBy || '')
        ? pagination.sortBy
        : 'name'
    ) as string;
    const sortOrder = pagination.sortOrder ?? 'ASC';

    const where = search
      ? {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            {
              countryCode: { contains: search, mode: 'insensitive' as const },
            },
          ],
        }
      : { isActive: true };

    const [data, totalItems] = await Promise.all([
      this.databaseService.country.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        select: {
          id: true,
          name: true,
          countryCode: true,
          flag: true,
          phoneCode: true,
          currency: true,
          latitude: true,
          longitude: true,
        },
      }),
      this.databaseService.country.count({ where }),
    ]);

    return { data, totalItems };
  }

  /**
   * Get states by country with pagination and search
   */
  async getStatesByCountry(countryId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = pagination.search?.trim();
    const sortBy = (
      STATE_ALLOWED_SORT_FIELDS.includes(pagination.sortBy || '')
        ? pagination.sortBy
        : 'name'
    ) as string;
    const sortOrder = pagination.sortOrder ?? 'ASC';

    const where = {
      countryId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { stateCode: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, totalItems] = await Promise.all([
      this.databaseService.state.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        select: {
          id: true,
          name: true,
          stateCode: true,
          countryId: true,
          latitude: true,
          longitude: true,
        },
      }),
      this.databaseService.state.count({ where }),
    ]);

    return { data, totalItems };
  }

  /**
   * Get cities by state with pagination and search
   */
  async getCitiesByState(stateId: string, pagination: PaginationDto) {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = pagination.search?.trim();
    const sortBy = (
      CITY_ALLOWED_SORT_FIELDS.includes(pagination.sortBy || '')
        ? pagination.sortBy
        : 'name'
    ) as string;
    const sortOrder = pagination.sortOrder ?? 'ASC';

    const where = {
      stateId,
      isActive: true,
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' as const } },
          { cityCode: { contains: search, mode: 'insensitive' as const } },
        ],
      }),
    };

    const [data, totalItems] = await Promise.all([
      this.databaseService.city.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder.toLowerCase() },
        select: {
          id: true,
          name: true,
          cityCode: true,
          stateId: true,
          countryId: true,
          latitude: true,
          longitude: true,
        },
      }),
      this.databaseService.city.count({ where }),
    ]);

    return { data, totalItems };
  }

  /**
   * Find city by id with full relations
   */
  async findCityById(cityId: string) {
    return this.databaseService.city.findUnique({
      where: { id: cityId },
      include: {
        state: true,
        country: true,
      },
    });
  }

  /**
   * Create a new address
   */
  async createAddress(dto: CreateAddressDto): Promise<Address> {
    return this.databaseService.address.create({
      data: {
        ownerType: dto.ownerType,
        ownerId: dto.ownerId,
        addressType: dto.addressType,
        isDefault: dto.isDefault ?? false,
        label: dto.label,
        addressLine1: dto.addressLine1,
        addressLine2: dto.addressLine2,
        landmark: dto.landmark,
        pincode: dto.pincode,
        cityId: dto.cityId,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
      },
    });
  }
}
