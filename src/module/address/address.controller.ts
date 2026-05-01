/**
 * Address Controller
 *
 * Exposes endpoints for address workflows and location lookups.
 */

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { AddressOwnerType, UserRole } from '@prisma/client';
import type { Response } from 'express';
import * as path from 'path';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { AddressService } from 'src/module/address/address.service';
import { CreateAddressDto } from 'src/module/address/dto/create-address.dto';
import { ResolveCoordinatesDto } from 'src/module/address/dto/resolve-coordinates.dto';
import { SaveFromMapDto } from 'src/module/address/dto/save-from-map.dto';
import { UpdateAddressDto } from 'src/module/address/dto/update-address.dto';
import { CurrentUser } from 'src/module/auth/decorator/current-user.decorator';
import { JwtAuthGuard } from 'src/module/auth/guards/access-token.guard';

@ApiTags('Address')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  // ── Helpers ─────────────────────────────────────────────────────────

  /**
   * Resolve address owner type from authenticated user role.
   *
   * @param role - Authenticated user role
   * @returns Address owner type
   */
  private resolveOwnerType(role: UserRole): AddressOwnerType {
    if (role === UserRole.USER) return AddressOwnerType.USER;
    if (role === UserRole.SELLER) return AddressOwnerType.SELLER;
    throw new BadRequestException('Unsupported account role for addresses');
  }

  // ── API 1 — GET /address/map ─────────────────────────────────────────

  /**
   * Serve the interactive map page.
   *
   * @param _userId - User id from JWT (unused)
   * @param res - Express response
   * @returns Map HTML asset
   */
  @Get('map')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Serve the interactive map page',
    description:
      'Returns the Map.html page. The page lets the user pin a location, ' +
      'auto-fills city / state / country via reverse-geocoding, and presents ' +
      'an editable address form. On save it calls POST /address/save-from-map.',
  })
  @ApiOkResponse({ description: 'HTML page served' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  serveMap(@CurrentUser('userId') _userId: string, @Res() res: Response) {
    // Resolve absolute path to the static Map.html asset.
    // Adjust if your static directory is configured differently.
    const filePath = path.resolve(
      __dirname,
      '..',
      '..',
      '..',
      '..',
      'static',
      'Map.html',
    );
    return res.sendFile(filePath);
  }

  // ── API 2 — POST /address/save-from-map ─────────────────────────────

  /**
   * Save address captured from the map UI.
   *
   * @param dto - Address payload from map
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @returns Created address
   */
  @Post('save-from-map')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Save address captured from the map UI',
    description:
      'Accepts the address form payload submitted by the Map.html page. ' +
      'The cityId must already be resolved (returned by POST /address/resolve-coordinates). ' +
      'ownerId and ownerType are derived automatically from the JWT token.',
  })
  @ApiBody({ type: SaveFromMapDto })
  @ApiCreatedResponse({ description: 'Address saved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async saveFromMap(
    @Body() dto: SaveFromMapDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    // Inject owner from token — never trust the client for these fields
    dto.ownerId = userId;
    dto.ownerType = this.resolveOwnerType(role);

    return this.addressService.saveFromMap(dto);
  }

  // ── Existing endpoints ──────────────────────────────────────────────

  /**
   * Preview address location on the map.
   *
   * @param dto - Address payload
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @returns Address with resolved coordinates and map URL
   */
  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview address location on map',
    description:
      'Geocodes the address and returns a Google Maps URL for the user to verify. ' +
      'Call POST /address/confirm with the returned address object to save.',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiOkResponse({
    description: 'Returns resolved coordinates and a map URL for confirmation',
    schema: {
      example: {
        addressLine1: '221B Baker Street',
        latitude: 21.1702,
        longitude: 72.8311,
        mapUrl:
          'https://www.google.com/maps?q=21.1702,72.8311&z=17&markers=21.1702,72.8311',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async preview(
    @Body() dto: CreateAddressDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    dto.ownerId = userId;
    dto.ownerType = this.resolveOwnerType(role);

    const previewResult = await this.addressService.preview(dto);

    return {
      ...previewResult.address,
      mapUrl: previewResult.mapUrl,
    };
  }

  /**
   * Confirm and persist the address.
   *
   * @param dto - Address payload
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @returns Created address
   */
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Confirm and save the address',
    description:
      'Saves the address to the database after the user has verified the map location. ' +
      'Pass the full object returned from POST /address/preview directly in the body.',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiCreatedResponse({ description: 'Address saved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async confirm(
    @Body() dto: CreateAddressDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    dto.ownerId = userId;
    dto.ownerType = this.resolveOwnerType(role);

    return this.addressService.confirm(dto);
  }

  /**
   * Resolve coordinates to a human-readable address and cityId.
   *
   * @param dto - Coordinate payload
   * @returns Resolved address data
   */
  @Post('resolve-coordinates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse-geocode coordinates to an address + resolve cityId',
    description:
      'Converts a latitude/longitude pair into a human-readable address ' +
      'using the Google Geocoding API, and attempts to match the city against ' +
      'the cities table to return a cityId. Call this after a user drops a pin.',
  })
  @ApiBody({ type: ResolveCoordinatesDto })
  @ApiOkResponse({ description: 'Address resolved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async resolveCoordinates(@Body() dto: ResolveCoordinatesDto) {
    return this.addressService.resolveCoordinates(dto.latitude, dto.longitude);
  }

  /**
   * Get all countries with pagination.
   *
   * @param pagination - Pagination query parameters
   * @returns Paginated countries
   */
  @Get('countries')
  @ApiOperation({ summary: 'Get all countries' })
  @ApiOkResponse({ description: 'Paginated list of countries' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  getCountries(@Query() pagination: PaginationDto) {
    return this.addressService.getCountries(pagination);
  }

  /**
   * Get states for a specific country.
   *
   * @param countryId - Country UUID
   * @param pagination - Pagination query parameters
   * @returns Paginated states
   */
  @Get('countries/:countryId/states')
  @ApiOperation({ summary: 'Get states by country' })
  @ApiParam({ name: 'countryId', type: String, description: 'Country UUID' })
  @ApiOkResponse({ description: 'Paginated list of states' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  getStatesByCountry(
    @Param('countryId', ParseUUIDPipe) countryId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.addressService.getStatesByCountry(countryId, pagination);
  }

  /**
   * Get cities for a specific state.
   *
   * @param stateId - State UUID
   * @param pagination - Pagination query parameters
   * @returns Paginated cities
   */
  @Get('states/:stateId/cities')
  @ApiOperation({ summary: 'Get cities by state' })
  @ApiParam({ name: 'stateId', type: String, description: 'State UUID' })
  @ApiOkResponse({ description: 'Paginated list of cities' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  getCitiesByState(
    @Param('stateId', ParseUUIDPipe) stateId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.addressService.getCitiesByState(stateId, pagination);
  }

  // ── GET /address/my ────────────────────────────────────────────────

  /**
   * Get all addresses for the logged-in user.
   *
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @param pagination - Pagination query parameters
   * @returns Paginated addresses
   */
  @Get('my')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all addresses of the logged-in user' })
  @ApiOkResponse({ description: 'Paginated list of addresses returned' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getMyAddresses(
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
    @Query() pagination: PaginationDto,
  ) {
    const ownerType = this.resolveOwnerType(role);
    return this.addressService.getMyAddresses(userId, ownerType, pagination);
  }

  // ── GET /address/my/:id ────────────────────────────────────────────

  /**
   * Get a single address by id for the logged-in user.
   *
   * @param id - Address UUID
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @returns Address payload
   */
  @Get('my/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a single address by id' })
  @ApiParam({ name: 'id', type: String, description: 'Address UUID' })
  @ApiOkResponse({ description: 'Address returned successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async getMyAddressById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const ownerType = this.resolveOwnerType(role);
    return this.addressService.getMyAddressById(id, userId, ownerType);
  }

  // ── PATCH /address/my/:id ──────────────────────────────────────────

  /**
   * Update an address for the logged-in user.
   *
   * @param id - Address UUID
   * @param dto - Update payload
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @returns Updated address payload
   */
  @Patch('my/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update an address' })
  @ApiParam({ name: 'id', type: String, description: 'Address UUID' })
  @ApiBody({ type: UpdateAddressDto })
  @ApiOkResponse({ description: 'Address updated successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async updateMyAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAddressDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const ownerType = this.resolveOwnerType(role);
    return this.addressService.updateMyAddress(id, userId, ownerType, dto);
  }

  // ── DELETE /address/my/:id ─────────────────────────────────────────

  /**
   * Soft delete an address for the logged-in user.
   *
   * @param id - Address UUID
   * @param userId - User id from JWT
   * @param role - User role from JWT
   * @returns Deletion confirmation
   */
  @Delete('my/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an address (soft delete)' })
  @ApiParam({ name: 'id', type: String, description: 'Address UUID' })
  @ApiOkResponse({ description: 'Address deleted successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async deleteMyAddress(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('role') role: UserRole,
  ) {
    const ownerType = this.resolveOwnerType(role);
    return this.addressService.deleteMyAddress(id, userId, ownerType);
  }
}
