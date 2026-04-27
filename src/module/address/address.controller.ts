import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AddressService } from './address.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { ResolveCoordinatesDto } from './dto/resolve-coordinates.dto';
import { JwtAuthGuard } from '../auth/guards/access-token.guard';
import { CurrentUser } from '../auth/decorator/current-user.decorator';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@ApiTags('Address')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('address')
export class AddressController {
  constructor(private readonly addressService: AddressService) {}

  /**
   * POST /address/preview
   *
   * Geocodes the address and returns coordinates + a Google Maps URL.
   * The user verifies the pin on the map before confirming.
   * Nothing is saved to the database at this step.
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
        address: {
          addressLine1: '221B Baker Street',
          latitude: 21.1702,
          longitude: 72.8311,
        },
        mapUrl:
          'https://www.google.com/maps?q=21.1702,72.8311&z=17&markers=21.1702,72.8311',
      },
    },
  })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async preview(
    @Body() dto: CreateAddressDto,
    @CurrentUser('userId') userId: string,
  ) {
    dto.ownerId = userId;
    return this.addressService.preview(dto);
  }

  /**
   * POST /address/confirm
   *
   * Called after the user has verified the map pin.
   * Saves the address (with confirmed lat/lng) to the database.
   *
   * Frontend flow:
   *   1. Call POST /address/preview  → get { address, mapUrl }
   *   2. Show mapUrl to user for verification
   *   3. If confirmed → call POST /address/confirm with the `address` object
   */
  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Confirm and save the address',
    description:
      'Saves the address to the database after the user has verified the map location. ' +
      'Pass the `address` object received from POST /address/preview directly in the body.',
  })
  @ApiBody({ type: CreateAddressDto })
  @ApiCreatedResponse({ description: 'Address saved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async confirm(
    @Body() dto: CreateAddressDto,
    @CurrentUser('userId') userId: string,
  ) {
    dto.ownerId = userId;

    return this.addressService.confirm(dto);
  }

  /**
   * POST /address/resolve-coordinates
   *
   * Accepts a lat/lng pair (sent from the map pin-drop) and returns a
   * human-readable address to pre-fill the address form fields.
   */
  @Post('resolve-coordinates')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reverse-geocode coordinates to an address',
    description:
      'Converts a latitude/longitude pair into a human-readable address ' +
      'using the Google Geocoding API. Call this after a user drops a pin ' +
      'on the map to pre-fill address form fields.',
  })
  @ApiBody({ type: ResolveCoordinatesDto })
  @ApiOkResponse({ description: 'Address resolved successfully' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  async resolveCoordinates(@Body() dto: ResolveCoordinatesDto) {
    return this.addressService.resolveCoordinates(dto.latitude, dto.longitude);
  }

  @Get('countries')
  @ApiOperation({
    summary: 'Get all countries',
    description:
      'Returns a paginated list of countries. ' +
      'Supports search by name or country code via the `search` query param.',
  })
  @ApiOkResponse({ description: 'Paginated list of countries' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  getCountries(@Query() pagination: PaginationDto) {
    return this.addressService.getCountries(pagination);
  }

  /**
   * GET /location/countries/:countryId/states
   * Returns paginated states belonging to a country.
   */
  @Get('countries/:countryId/states')
  @ApiOperation({
    summary: 'Get states by country',
    description:
      'Returns a paginated list of states for the given countryId. ' +
      'Supports search by name or state code.',
  })
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
   * GET /location/states/:stateId/cities
   * Returns paginated cities belonging to a state.
   */
  @Get('states/:stateId/cities')
  @ApiOperation({
    summary: 'Get cities by state',
    description:
      'Returns a paginated list of cities for the given stateId. ' +
      'Supports search by name or city code.',
  })
  @ApiParam({ name: 'stateId', type: String, description: 'State UUID' })
  @ApiOkResponse({ description: 'Paginated list of cities' })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired token' })
  getCitiesByState(
    @Param('stateId', ParseUUIDPipe) stateId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.addressService.getCitiesByState(stateId, pagination);
  }
}
