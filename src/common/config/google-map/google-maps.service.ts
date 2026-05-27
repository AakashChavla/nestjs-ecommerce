import {
  Injectable,
  InternalServerErrorException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// ── Public types ────────────────────────────────────────────────────────────

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

// ── Private Google API response shapes ──────────────────────────────────────

interface GoogleGeocodeResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    geometry: { location: { lat: number; lng: number } };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
}

// ────────────────────────────────────────────────────────────────────────────

@Injectable()
export class GoogleMapsService implements OnModuleInit {
  private readonly logger = new Logger(GoogleMapsService.name);
  private readonly apiKey: string;
  private readonly geocodingBaseUrl: string;
  private isReady = false;

  private static readonly DEFAULT_GEOCODING_URL =
    'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('GOOGLE_MAPS_API_KEY') ?? '';
    this.geocodingBaseUrl =
      this.configService.get<string>('GOOGLE_MAPS_GEOCODING_BASE_URL') ??
      GoogleMapsService.DEFAULT_GEOCODING_URL;
  }

  onModuleInit(): void {
    if (!this.apiKey) {
      this.logger.warn('GOOGLE_MAPS_API_KEY is not set — service disabled');
      return;
    }

    this.isReady = true;
    this.logger.log('✅ Google Maps service connected successfully');
  }

  /** Converts a human-readable address string into latitude / longitude. */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    this.assertReady();

    const data = await this.fetchGeocodingApi({ address });

    const [result] = data.results;
    const { lat, lng } = result.geometry.location;

    return {
      latitude: lat,
      longitude: lng,
      formattedAddress: result.formatted_address,
    };
  }

  /** Converts latitude / longitude coordinates into a human-readable address. */
  async reverseGeocode(
    coordinates: Coordinates,
  ): Promise<ReverseGeocodeResult> {
    this.assertReady();

    const data = await this.fetchGeocodingApi({
      latlng: `${coordinates.latitude},${coordinates.longitude}`,
    });

    const [result] = data.results;

    return {
      formattedAddress: result.formatted_address,
      addressComponents: result.address_components.map((c) => ({
        longName: c.long_name,
        shortName: c.short_name,
        types: c.types,
      })),
    };
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private assertReady(): void {
    if (!this.isReady) {
      throw new InternalServerErrorException(
        'Google Maps service is not configured properly',
      );
    }
  }

  private async fetchGeocodingApi(
    params: Record<string, string>,
  ): Promise<GoogleGeocodeResponse> {
    const url = new URL(this.geocodingBaseUrl);
    url.searchParams.set('key', this.apiKey);

    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }

    const response = await fetch(url.toString());

    if (!response.ok) {
      throw new InternalServerErrorException(
        `Google Geocoding API request failed with status ${response.status}`,
      );
    }

    const data = (await response.json()) as GoogleGeocodeResponse;

    if (data.status !== 'OK' || !data.results.length) {
      throw new InternalServerErrorException(
        `Google Geocoding API error: ${data.status}`,
      );
    }

    return data;
  }
}
