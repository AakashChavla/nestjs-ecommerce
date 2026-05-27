/**
 * Address Service
 *
 * Handles address workflows including geocoding, persistence, and retrieval.
 */

import { Injectable } from '@nestjs/common';
import { AddressOwnerType } from '@prisma/client';
import { I18nService } from 'nestjs-i18n';
import { GoogleMapsService } from 'src/common/config/google-map/google-maps.service';
import {
  PaginatedResponseDto,
  PaginationMetaDto,
} from 'src/common/dto/paginated-response.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { NotFoundException } from 'src/common/exceptions';
import { AddressRepository } from 'src/module/address/address.repository';
import { CreateAddressDto } from 'src/module/address/dto/create-address.dto';
import { SaveFromMapDto } from 'src/module/address/dto/save-from-map.dto';
import { UpdateAddressDto } from 'src/module/address/dto/update-address.dto';

@Injectable()
export class AddressService {
  constructor(
    private readonly googleMapsService: GoogleMapsService,
    private readonly addressRepository: AddressRepository,
    private readonly i18nService: I18nService,
  ) {}

  // ── Pagination helper ───────────────────────────────────────────────

  /**
   * Build a pagination meta object for paginated responses.
   *
   * @param pagination - Pagination parameters
   * @param totalItems - Total number of items
   * @param itemsOnCurrentPage - Number of items on the current page
   * @returns Pagination meta information
   */
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

  // ── Countries ───────────────────────────────────────────────────────

  /**
   * Retrieve a paginated list of countries.
   *
   * @param pagination - Pagination parameters
   * @returns Paginated response of countries
   */
  async getCountries(
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const { data, totalItems } =
      await this.addressRepository.getCountries(pagination);
    const meta = this.buildMeta(pagination, totalItems, data.length);
    return new PaginatedResponseDto(data, meta);
  }

  // ── States by Country ───────────────────────────────────────────────

  /**
   * Retrieve a paginated list of states for a given country.
   *
   * @param countryId - Country UUID
   * @param pagination - Pagination parameters
   * @returns Paginated response of states
   */
  async getStatesByCountry(
    countryId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const { data, totalItems } =
      await this.addressRepository.getStatesByCountry(countryId, pagination);
    const meta = this.buildMeta(pagination, totalItems, data.length);
    return new PaginatedResponseDto(data, meta);
  }

  // ── Cities by State ────────────────────────────────────────────────

  /**
   * Retrieve a paginated list of cities for a given state.
   *
   * @param stateId - State UUID
   * @param pagination - Pagination parameters
   * @returns Paginated response of cities
   */
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

  // ── Preview (existing flow) ─────────────────────────────────────────

  /**
   * Geocodes the address and returns coordinates + a Google Maps URL.
   * Nothing is saved to the database at this point.
   *
   * @param dto - Address payload
   * @returns Address with coordinates and map URL
   */
  async preview(dto: CreateAddressDto) {
    let latitude = dto.latitude;
    let longitude = dto.longitude;

    if (latitude === undefined || longitude === undefined) {
      const city = await this.addressRepository.findCityById(dto.cityId);

      if (!city) {
        throw new NotFoundException(
          this.i18nService.t('address.city_not_found'),
          'CITY_NOT_FOUND',
        );
      }

      const addressString = [
        dto.addressLine1,
        dto.addressLine2,
        dto.landmark,
        city.name,
        city.state.name,
        dto.pincode,
        city.country.name,
      ]
        .filter(Boolean)
        .join(', ');

      const coords = await this.googleMapsService.geocodeAddress(addressString);
      latitude = coords.latitude;
      longitude = coords.longitude;
    }

    const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=17&markers=${latitude},${longitude}`;

    return {
      address: { ...dto, latitude, longitude },
      mapUrl,
    };
  }

  // ── Confirm (existing flow) ─────────────────────────────────────────

  /**
   * Called after the user has verified the map pin. Saves the address
   * (with confirmed lat/lng) to the database.
   *
   * @param dto - Address payload
   * @returns Created address
   */
  async confirm(dto: CreateAddressDto) {
    return this.addressRepository.createAddress(dto);
  }

  // ── Resolve Coordinates (enhanced) ─────────────────────────────────

  /**
   * Resolve a lat/lng pair into a human-readable address and matching cityId.
   *
   * @param latitude - Latitude from pin-drop
   * @param longitude - Longitude from pin-drop
   * @returns Resolved address fields and matched cityId (if any)
   */
  async resolveCoordinates(latitude: number, longitude: number) {
    const result = await this.googleMapsService.reverseGeocode({
      latitude,
      longitude,
    });

    const components = result.addressComponents;

    const get = (type: string) =>
      components.find((c) => c.types.includes(type))?.longName ?? '';

    const cityName =
      get('locality') ||
      get('sublocality_level_1') ||
      get('administrative_area_level_2');
    const stateName = get('administrative_area_level_1');
    const countryName = get('country');
    const pincode = get('postal_code');

    // ── Step 1: try exact name match ─────────────────────────────────
    let cityId: string | null = null;
    let resolvedCityName = cityName;

    if (cityName) {
      const matchedCity =
        await this.addressRepository.findCityByNameAndLocation(
          cityName,
          stateName,
          countryName,
        );
      cityId = matchedCity?.id ?? null;
    }

    // ── Step 2: fallback — find nearest city by coordinates ──────────
    if (!cityId) {
      const nearestCity = await this.addressRepository.findNearestCity(
        latitude,
        longitude,
      );

      if (nearestCity) {
        cityId = nearestCity.id;
        resolvedCityName = nearestCity.name;
      }
    }

    // ── Response shaped to match SaveFromMapDto fields ───────────────
    return {
      formattedAddress: result.formattedAddress,
      addressLine2:
        [cityName, stateName].filter(Boolean).join(', ') || undefined,
      pincode: pincode || undefined,
      cityId,
      latitude,
      longitude,
      city: resolvedCityName,
      state: stateName,
      country: countryName,
    };
  }

  // ── Save from Map (new) ────────────────────────────────────────────

  /**
   * Persist an address payload submitted from the map UI.
   *
   * @param dto - Map form payload with ownerId/ownerType injected
   * @returns Created address
   */
  async saveFromMap(dto: SaveFromMapDto) {
    const city = await this.addressRepository.findCityById(dto.cityId);

    if (!city) {
      throw new NotFoundException(
        this.i18nService.t('address.city_not_found'),
        'CITY_NOT_FOUND',
      );
    }

    return this.addressRepository.createAddress({
      ownerType: dto.ownerType,
      ownerId: dto.ownerId,
      addressType: dto.addressType,
      isDefault: dto.isDefault,
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
    });
  }

  // ── Get all addresses ──────────────────────────────────────────────

  /**
   * Retrieve all addresses for an owner with pagination.
   *
   * @param ownerId - Owner UUID
   * @param ownerType - Owner type (USER or SELLER)
   * @param pagination - Pagination parameters
   * @returns Paginated response of addresses
   */
  async getMyAddresses(
    ownerId: string,
    ownerType: AddressOwnerType,
    pagination: PaginationDto,
  ): Promise<PaginatedResponseDto<unknown>> {
    const { data, totalItems } = await this.addressRepository.findAllByOwner(
      ownerId,
      ownerType,
      pagination,
    );
    const meta = this.buildMeta(pagination, totalItems, data.length);
    return new PaginatedResponseDto(data, meta);
  }

  // ── Get address by id ──────────────────────────────────────────────

  /**
   * Retrieve a single address by id for an owner.
   *
   * @param id - Address UUID
   * @param ownerId - Owner UUID
   * @param ownerType - Owner type (USER or SELLER)
   * @returns Message and address payload
   */
  async getMyAddressById(
    id: string,
    ownerId: string,
    ownerType: AddressOwnerType,
  ) {
    const address = await this.addressRepository.findOneByOwner(
      id,
      ownerId,
      ownerType,
    );

    if (!address) {
      throw new NotFoundException(
        this.i18nService.t('address.not_found'),
        'ADDRESS_NOT_FOUND',
      );
    }

    return {
      message: this.i18nService.t('address.retrieved_success'),
      data: address,
    };
  }

  // ── Update address ─────────────────────────────────────────────────

  /**
   * Update an address owned by the requester.
   *
   * @param id - Address UUID
   * @param ownerId - Owner UUID
   * @param ownerType - Owner type (USER or SELLER)
   * @param dto - Update payload
   * @returns Message and updated address payload
   */
  async updateMyAddress(
    id: string,
    ownerId: string,
    ownerType: AddressOwnerType,
    dto: UpdateAddressDto,
  ) {
    const existing = await this.addressRepository.findOneByOwner(
      id,
      ownerId,
      ownerType,
    );

    if (!existing) {
      throw new NotFoundException(
        this.i18nService.t('address.not_found'),
        'ADDRESS_NOT_FOUND',
      );
    }

    if (dto.cityId) {
      const city = await this.addressRepository.findCityById(dto.cityId);
      if (!city) {
        throw new NotFoundException(
          this.i18nService.t('address.city_not_found'),
          'CITY_NOT_FOUND',
        );
      }
    }

    const updated = await this.addressRepository.updateAddress(id, dto);

    return {
      message: this.i18nService.t('address.updated_success'),
      data: updated,
    };
  }

  // ── Delete address ─────────────────────────────────────────────────

  /**
   * Soft delete an address owned by the requester.
   *
   * @param id - Address UUID
   * @param ownerId - Owner UUID
   * @param ownerType - Owner type (USER or SELLER)
   * @returns Message and deleted address id
   */
  async deleteMyAddress(
    id: string,
    ownerId: string,
    ownerType: AddressOwnerType,
  ) {
    const existing = await this.addressRepository.findOneByOwner(
      id,
      ownerId,
      ownerType,
    );

    if (!existing) {
      throw new NotFoundException(
        this.i18nService.t('address.not_found'),
        'ADDRESS_NOT_FOUND',
      );
    }

    await this.addressRepository.softDeleteAddress(id);

    return {
      message: this.i18nService.t('address.deleted_success'),
      data: { id },
    };
  }
}
