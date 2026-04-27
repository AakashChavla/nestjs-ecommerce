import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

export interface ReverseGeocodeResult {
  formattedAddress: string;
  addressComponents: {
    longName: string;
    shortName: string;
    types: string[];
  }[];
}

/**
 * GoogleMapsService
 *
 * Wraps the Google Geocoding API for two server-side operations:
 *   1. geocodeAddress  – converts a human-readable address → { lat, lng }
 *   2. reverseGeocode  – converts { lat, lng } → human-readable address
 *
 * Used by AddressService to auto-fill coordinates when a user submits
 * an address, and to resolve an address when a user pins a map location.
 */
@Injectable()
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly geocodingBaseUrl: string;

  constructor(private readonly configService: ConfigService) {
    const key = this.configService.get<string>('GOOGLE_MAPS_API_KEY');
    if (!key) {
      throw new Error('GOOGLE_MAPS_API_KEY is not defined in environment');
    }
    this.apiKey = key;
    this.geocodingBaseUrl =
      this.configService.get<string>('GOOGLE_MAPS_GEOCODING_BASE_URL') ||
      'https://maps.googleapis.com/maps/api/geocode/json';
  }

  /**
   * Converts a human-readable address string into latitude / longitude.
   *
   * Usage (inside AddressService.create):
   *   const coords = await this.googleMapsService.geocodeAddress(
   *     `${dto.addressLine1}, ${dto.pincode}, India`,
   *   );
   *   // store coords.latitude and coords.longitude in the DB
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    const url = new URL(this.geocodingBaseUrl);
    url.searchParams.set('address', address);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Geocoding request failed with status ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
      }>;
    };

    if (data.status !== 'OK' || !data.results.length) {
      throw new InternalServerErrorException(
        `Geocoding failed: ${data.status} — address may be invalid or ambiguous`,
      );
    }

    const { lat, lng } = data.results[0].geometry.location;

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: data.results[0].formatted_address,
    };
  }

  /**
   * Converts latitude / longitude coordinates into a human-readable address.
   *
   * Usage (inside AddressService, after user pins a map location):
   *   const result = await this.googleMapsService.reverseGeocode({
   *     latitude: dto.latitude,
   *     longitude: dto.longitude,
   *   });
   *   // use result.formattedAddress or result.addressComponents to pre-fill fields
   */
  async reverseGeocode(
    coordinates: Coordinates,
  ): Promise<ReverseGeocodeResult> {
    const url = new URL(this.geocodingBaseUrl);
    url.searchParams.set(
      'latlng',
      `${coordinates.latitude},${coordinates.longitude}`,
    );
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Reverse geocoding request failed with status ${response.status}`,
      );
    }

    const data = (await response.json()) as {
      status: string;
      results: Array<{
        formatted_address: string;
        address_components: Array<{
          long_name: string;
          short_name: string;
          types: string[];
        }>;
      }>;
    };

    if (data.status !== 'OK' || !data.results.length) {
      throw new InternalServerErrorException(
        `Reverse geocoding failed: ${data.status}`,
      );
    }

    const best = data.results[0];

    return {
      formattedAddress: best.formatted_address,
      addressComponents: best.address_components.map((c) => ({
        longName: c.long_name,
        shortName: c.short_name,
        types: c.types,
      })),
    };
  }
}
