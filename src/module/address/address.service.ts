import { DatabaseService } from './../../common/database/database.service';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GoogleMapsService } from '../../common/config/google-map/google-maps.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/common/dto/paginated-response.dto';

@Injectable()
export class AddressService {
  constructor(
    private readonly googleMapsService: GoogleMapsService,
    private readonly databaseService: DatabaseService,
  ) {}

  // ── Helper ──────────────────────────────────────────────────────────────
  private buildMeta(
    pagination: PaginationDto,
    totalItems: number,
  ): PaginationMetaDto {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      page,
      limit,
      totalItems,
      totalPages,
      itemsOnCurrentPage: 0, // updated after data fetch
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  // ── Countries ───────────────────────────────────────────────────────────
  async getCountries(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = pagination.search?.trim();
    const sortBy = pagination.sortBy ?? 'name';
    const sortOrder = pagination.sortOrder ?? 'ASC';

    const where = search
      ? {
          isActive: true,
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { countryCode: { contains: search, mode: 'insensitive' as const } },
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

    const meta = this.buildMeta(pagination, totalItems);
    meta.itemsOnCurrentPage = data.length;

    return new PaginatedResponseDto(data, meta);
  }

  // ── States by Country ───────────────────────────────────────────────────
  async getStatesByCountry(
    countryId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = pagination.search?.trim();
    const sortBy = pagination.sortBy ?? 'name';
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

    const meta = this.buildMeta(pagination, totalItems);
    meta.itemsOnCurrentPage = data.length;

    return new PaginatedResponseDto(data, meta);
  }

  // ── Cities by State ─────────────────────────────────────────────────────
  async getCitiesByState(
    stateId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const skip = (page - 1) * limit;
    const search = pagination.search?.trim();
    const sortBy = pagination.sortBy ?? 'name';
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

    const meta = this.buildMeta(pagination, totalItems);
    meta.itemsOnCurrentPage = data.length;

    return new PaginatedResponseDto(data, meta);
  }

  /**
   * STEP 1 — Preview
   *
   * Geocodes the address and returns coordinates + a Google Maps URL.
   * Nothing is saved to the database at this point.
   */
  async preview(dto: CreateAddressDto) {
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (latitude === undefined || longitude === undefined) {
      // Fetch city → state → country so we can build a precise address string.
      // A vague string like "221B Baker St, 395001, India" gives poor accuracy.
      // A full string like "221B Baker St, Surat, Gujarat, India" is far better.
      const city = await this.databaseService.city.findUnique({
        where: { id: dto.cityId },
        include: {
          state: true,
          country: true,
        },
      });

      if (!city) {
        throw new NotFoundException(`City with id "${dto.cityId}" not found`);
      }

      // Build the most complete address string possible for accurate geocoding.
      // Order matters — Google prefers street → locality → region → postal → country
      const addressString = [
        dto.addressLine1,
        dto.addressLine2,
        dto.landmark,
        city.name, // e.g. "Surat"
        city.state.name, // e.g. "Gujarat"
        dto.pincode, // e.g. "395001"
        city.country.name, // e.g. "India"
      ]
        .filter(Boolean)
        .join(', ');

      const coords = await this.googleMapsService.geocodeAddress(addressString);
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    // Google Maps URL with a marker at the resolved pin
    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=17&markers=${latitude},${longitude}`;

    return {
      // Echo the full dto back so the frontend can pass it unchanged to /confirm
      address: { ...dto, latitude, longitude },
      mapUrl,
    };
  }

  /**
   * STEP 2 — Confirm
   *
   * Called after the user has verified the map pin. Saves the address
   * (with confirmed lat/lng) to the database.
   */
  async confirm(dto: CreateAddressDto) {
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

  /**
   * Called when the frontend sends coordinates from the map pin-drop.
   * Returns a formatted address string to pre-fill address form fields.
   */
  async resolveCoordinates(latitude: number, longitude: number) {
    return this.googleMapsService.reverseGeocode({ latitude, longitude });
  }
}
