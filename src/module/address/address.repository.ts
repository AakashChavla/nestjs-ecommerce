/**
 * Address Repository — data-access layer for Address, Country, State, and City.
 *
 * Provides read/write operations for address and location data.
 */

import { Injectable } from '@nestjs/common';
import { AddressOwnerType, AddressType } from '@prisma/client';
import { DatabaseService } from 'src/common';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { CreateAddressDto } from 'src/module/address/dto/create-address.dto';

interface UpdateAddressData {
  addressType?: AddressType;
  isDefault?: boolean;
  label?: string;
  addressLine1?: string;
  addressLine2?: string;
  landmark?: string;
  pincode?: string;
  cityId?: string;
  latitude?: number;
  longitude?: number;
  contactName?: string;
  contactPhone?: string;
}

@Injectable()
export class AddressRepository {
  constructor(private readonly databaseService: DatabaseService) {}

  // ── Address ─────────────────────────────────────────────────────────

  /**
   * Create a new address for an owner.
   *
   * @param dto - Partial address payload
   * @returns Created address with city, state, and country relations
   */
  async createAddress(dto: Partial<CreateAddressDto>) {
    return this.databaseService.address.create({
      data: {
        ownerType: dto.ownerType!,
        ownerId: dto.ownerId!,
        addressType: dto.addressType ?? 'HOME',
        isDefault: dto.isDefault ?? false,
        label: dto.label,
        addressLine1: dto.addressLine1!,
        addressLine2: dto.addressLine2,
        landmark: dto.landmark,
        pincode: dto.pincode!,
        cityId: dto.cityId!,
        latitude: dto.latitude,
        longitude: dto.longitude,
        contactName: dto.contactName,
        contactPhone: dto.contactPhone,
      },
      include: {
        city: {
          include: {
            state: true,
            country: true,
          },
        },
      },
    });
  }

  // ── City lookups ────────────────────────────────────────────────────

  /**
   * Find a city by its UUID, including its parent state and country.
   * Used by preview() and saveFromMap() to verify the cityId exists.
   *
   * @param cityId - City UUID
   * @returns City with state and country relations, or null if not found
   */
  async findCityById(cityId: string) {
    return this.databaseService.city.findFirst({
      where: { id: cityId, deletedAt: null, isActive: true },
      include: {
        state: true,
        country: true,
      },
    });
  }

  /**
   * Find the best-matching city in the database given the names returned
   * by Google's reverse-geocoder.
   *
   * Matching strategy (most-specific to least):
   *   1. City name + state name + country name  (exact, case-insensitive)
   *   2. City name + country name               (fallback if state not found)
   *   3. City name only                         (last resort)
   *
   * Returns the first active, non-deleted match, or null if nothing found.
   *
   * Note: city/state/country names from Google may differ slightly from the
   * seeded data (e.g. "Bengaluru" vs "Bangalore"). Consider storing alternate
   * names in a separate column and extending this query as your dataset grows.
   *
   * @param cityName - City name from reverse-geocoding
   * @param stateName - State/province name from reverse-geocoding
   * @param countryName - Country name from reverse-geocoding
   * @returns Matched city id and name, or null
   */
  async findCityByNameAndLocation(
    cityName: string,
    stateName: string,
    countryName: string,
  ) {
    const baseCityWhere = {
      deletedAt: null,
      isActive: true,
      name: { equals: cityName, mode: 'insensitive' as const },
    };

    // 1️⃣ Full match — city + state + country
    if (stateName && countryName) {
      const full = await this.databaseService.city.findFirst({
        where: {
          ...baseCityWhere,
          state: { name: { equals: stateName, mode: 'insensitive' } },
          country: { name: { equals: countryName, mode: 'insensitive' } },
        },
        select: { id: true, name: true },
      });
      if (full) return full;
    }

    // 2️⃣ Fallback — city + country only
    if (countryName) {
      const withCountry = await this.databaseService.city.findFirst({
        where: {
          ...baseCityWhere,
          country: { name: { equals: countryName, mode: 'insensitive' } },
        },
        select: { id: true, name: true },
      });
      if (withCountry) return withCountry;
    }

    // 3️⃣ Last resort — city name only
    const nameOnly = await this.databaseService.city.findFirst({
      where: baseCityWhere,
      select: { id: true, name: true },
    });

    return nameOnly ?? null;
  }

  // ── Countries ────────────────────────────────────────────────────────

  /**
   * Retrieve all active countries with pagination and sorting.
   *
   * @param pagination - Pagination parameters
   * @returns Data array and total item count
   */
  async getCountries(pagination: PaginationDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = pagination;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['name', 'countryCode', 'createdAt'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'name';

    const where = {
      deletedAt: null,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              {
                countryCode: { contains: search, mode: 'insensitive' as const },
              },
            ],
          }
        : {}),
    };

    const [data, totalItems] = await this.databaseService.$transaction([
      this.databaseService.country.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder.toLowerCase() },
        select: {
          id: true,
          name: true,
          countryCode: true,
          flag: true,
          phoneCode: true,
          currency: true,
        },
      }),
      this.databaseService.country.count({ where }),
    ]);

    return { data, totalItems };
  }

  // ── States ───────────────────────────────────────────────────────────

  /**
   * Retrieve states by country ID with pagination and sorting.
   *
   * @param countryId - Country UUID
   * @param pagination - Pagination parameters
   * @returns Data array and total item count
   */
  async getStatesByCountry(countryId: string, pagination: PaginationDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = pagination;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['name', 'stateCode', 'createdAt'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'name';

    const where = {
      countryId,
      deletedAt: null,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { stateCode: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, totalItems] = await this.databaseService.$transaction([
      this.databaseService.state.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder.toLowerCase() },
        select: {
          id: true,
          name: true,
          stateCode: true,
          countryId: true,
        },
      }),
      this.databaseService.state.count({ where }),
    ]);

    return { data, totalItems };
  }

  // ── Cities ───────────────────────────────────────────────────────────

  /**
   * Retrieve cities by state ID with pagination and sorting.
   *
   * @param stateId - State UUID
   * @param pagination - Pagination parameters
   * @returns Data array and total item count
   */
  async getCitiesByState(stateId: string, pagination: PaginationDto) {
    const {
      page = 1,
      limit = 10,
      search,
      sortBy = 'name',
      sortOrder = 'ASC',
    } = pagination;
    const skip = (page - 1) * limit;

    const allowedSortFields = ['name', 'cityCode', 'createdAt'];
    const orderByField = allowedSortFields.includes(sortBy) ? sortBy : 'name';

    const where = {
      stateId,
      deletedAt: null,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' as const } },
              { cityCode: { contains: search, mode: 'insensitive' as const } },
            ],
          }
        : {}),
    };

    const [data, totalItems] = await this.databaseService.$transaction([
      this.databaseService.city.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder.toLowerCase() },
        select: {
          id: true,
          name: true,
          cityCode: true,
          stateId: true,
          countryId: true,
        },
      }),
      this.databaseService.city.count({ where }),
    ]);

    return { data, totalItems };
  }

  /**
   * Find the nearest active city to the given coordinates using
   * Haversine distance. Returns the closest city within ~200 km,
   * or null if nothing is close enough.
   *
   * @param latitude - Latitude
   * @param longitude - Longitude
   * @returns Nearest city id and name, or null
   */
  async findNearestCity(latitude: number, longitude: number) {
    const results: Array<{ id: string; name: string; distance_km: number }> =
      await this.databaseService.$queryRawUnsafe(
        `
        SELECT
          id::text,
          name,
          (
            6371 * acos(
              LEAST(1.0, GREATEST(-1.0,
                cos(radians($1)) *
                cos(radians(latitude::float)) *
                cos(radians(longitude::float) - radians($2)) +
                sin(radians($1)) *
                sin(radians(latitude::float))
              ))
            )
          ) AS distance_km
        FROM cities
        WHERE
          is_active  = true
          AND deleted_at IS NULL
          AND latitude   IS NOT NULL
          AND longitude  IS NOT NULL
        ORDER BY distance_km ASC
        LIMIT 1
      `,
        latitude,
        longitude,
      );

    if (!results.length || Number(results[0].distance_km) > 200) return null;

    return { id: results[0].id, name: results[0].name };
  }

  // ── Owner address queries ────────────────────────────────────────────

  /**
   * Retrieve all addresses for a specific owner with pagination and sorting.
   *
   * @param ownerId - UUID of the owner
   * @param ownerType - Type of owner (USER or SELLER)
   * @param pagination - Pagination parameters
   * @returns Data array and total item count
   */
  async findAllByOwner(
    ownerId: string,
    ownerType: AddressOwnerType,
    pagination: PaginationDto,
  ) {
    const {
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;
    const skip = (page - 1) * limit;

    const allowedSortFields = [
      'createdAt',
      'updatedAt',
      'addressType',
      'isDefault',
    ];
    const orderByField = allowedSortFields.includes(sortBy)
      ? sortBy
      : 'createdAt';

    const where = { ownerId, ownerType, deletedAt: null };

    const [data, totalItems] = await this.databaseService.$transaction([
      this.databaseService.address.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [orderByField]: sortOrder.toLowerCase() },
        include: {
          city: {
            include: {
              state: true,
              country: true,
            },
          },
        },
      }),
      this.databaseService.address.count({ where }),
    ]);

    return { data, totalItems };
  }

  /**
   * Retrieve a single address by ID, verifying it belongs to the owner.
   *
   * @param id - Address UUID
   * @param ownerId - UUID of the owner
   * @param ownerType - Type of owner (USER or SELLER)
   * @returns Address with city, state, and country relations, or null
   */
  async findOneByOwner(
    id: string,
    ownerId: string,
    ownerType: AddressOwnerType,
  ) {
    return this.databaseService.address.findFirst({
      where: { id, ownerId, ownerType, deletedAt: null },
      include: {
        city: {
          include: {
            state: true,
            country: true,
          },
        },
      },
    });
  }

  /**
   * Update an address with provided fields. Only defined fields are updated.
   *
   * @param id - Address UUID
   * @param data - Fields to update
   * @returns Updated address with city, state, and country relations
   */
  async updateAddress(id: string, data: UpdateAddressData) {
    return this.databaseService.address.update({
      where: { id },
      data: {
        ...(data.addressType !== undefined && {
          addressType: data.addressType,
        }),
        ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
        ...(data.label !== undefined && { label: data.label }),
        ...(data.addressLine1 !== undefined && {
          addressLine1: data.addressLine1,
        }),
        ...(data.addressLine2 !== undefined && {
          addressLine2: data.addressLine2,
        }),
        ...(data.landmark !== undefined && { landmark: data.landmark }),
        ...(data.pincode !== undefined && { pincode: data.pincode }),
        ...(data.cityId !== undefined && { cityId: data.cityId }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.contactName !== undefined && {
          contactName: data.contactName,
        }),
        ...(data.contactPhone !== undefined && {
          contactPhone: data.contactPhone,
        }),
      },
      include: {
        city: {
          include: {
            state: true,
            country: true,
          },
        },
      },
    });
  }

  /**
   * Soft delete an address by setting its deletedAt timestamp.
   *
   * @param id - Address UUID
   * @returns Address id and deletedAt timestamp
   */
  async softDeleteAddress(id: string) {
    return this.databaseService.address.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: { id: true, deletedAt: true },
    });
  }
}
