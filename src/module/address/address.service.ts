import { Injectable } from '@nestjs/common';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/common/dto/paginated-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { NotFoundException } from 'src/common/exceptions';
import { GoogleMapsService } from '../../common/config/google-map/google-maps.service';
import { AddressRepository } from './address.repository';
import { CreateAddressDto } from './dto/create-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private readonly googleMapsService: GoogleMapsService,
    private readonly addressRepository: AddressRepository,
  ) {}

  // ── Helper ──────────────────────────────────────────────────────────────
  private buildMeta(
    pagination: PaginationDto,
    totalItems: number,
    itemsOnCurrentPage: number,
  ): PaginationMetaDto {
    const page = pagination.page ?? 1;
    const limit = pagination.limit ?? 10;
    const totalPages = Math.ceil(totalItems / limit);

    return {
      page,
      limit,
      totalItems,
      totalPages,
      itemsOnCurrentPage,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    };
  }

  // ── Countries ───────────────────────────────────────────────────────────
  async getCountries(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const { data, totalItems } =
      await this.addressRepository.getCountries(pagination);

    const meta = this.buildMeta(pagination, totalItems, data.length);

    return new PaginatedResponseDto(data, meta);
  }

  // ── States by Country ───────────────────────────────────────────────────
  async getStatesByCountry(
    countryId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const { data, totalItems } =
      await this.addressRepository.getStatesByCountry(countryId, pagination);

    const meta = this.buildMeta(pagination, totalItems, data.length);

    return new PaginatedResponseDto(data, meta);
  }

  // ── Cities by State ─────────────────────────────────────────────────────
  async getCitiesByState(
    stateId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const { data, totalItems } = await this.addressRepository.getCitiesByState(
      stateId,
      pagination,
    );

    const meta = this.buildMeta(pagination, totalItems, data.length);

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
      const city = await this.addressRepository.findCityById(dto.cityId);

      if (!city) {
        throw new NotFoundException(
          `City with id "${dto.cityId}" not found`,
          'CITY_NOT_FOUND',
        );
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
    return this.addressRepository.createAddress(dto);
  }

  /**
   * Called when the frontend sends coordinates from the map pin-drop.
   * Returns a formatted address string to pre-fill address form fields.
   */
  async resolveCoordinates(latitude: number, longitude: number) {
    return this.googleMapsService.reverseGeocode({ latitude, longitude });
  }
}
