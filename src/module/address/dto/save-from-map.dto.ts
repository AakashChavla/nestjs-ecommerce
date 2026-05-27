import {
  ApiHideProperty,
  ApiProperty,
  ApiPropertyOptional,
} from '@nestjs/swagger';
import { AddressOwnerType, AddressType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsUUID,
  Matches,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RequiredString } from 'src/common/helpers/validation/required-string.validation';
import { REGEX } from '../../../common/helpers/constant/regex';

/**
 * DTO for POST /address/save-from-map
 *
 * Sent by the Map.html page after the user has:
 *   1. Confirmed a pin location (lat / lng)
 *   2. Received a cityId from POST /address/resolve-coordinates
 *   3. Filled in and submitted the address form
 *
 * ownerId and ownerType are NEVER accepted from the client — they are
 * injected by the controller from the JWT token.
 */
export class SaveFromMapDto {
  // ── Injected by the controller from JWT ─────────────────────────────────

  @IsOptional()
  @ApiHideProperty()
  ownerType?: AddressOwnerType;

  @IsOptional()
  @ApiHideProperty()
  ownerId?: string;

  // ── Address form fields ──────────────────────────────────────────────────

  @ApiPropertyOptional({
    description: 'Address type',
    enum: AddressType,
    example: AddressType.HOME,
    default: AddressType.HOME,
  })
  @IsOptional()
  @IsEnum(AddressType, {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Address Type',
    }),
  })
  addressType?: AddressType;

  @ApiPropertyOptional({
    description: 'Mark this address as default for the owner',
    example: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Is Default',
    }),
  })
  isDefault?: boolean;

  @ApiPropertyOptional({
    description: 'Short label for this address',
    example: 'Home',
    minLength: 1,
    maxLength: 50,
  })
  @IsOptional()
  @RequiredString('Label', 1, 50)
  label?: string;

  @ApiProperty({
    description: 'Primary address line (house / flat / building no.)',
    example: '221B Baker Street',
    minLength: 2,
    maxLength: 255,
  })
  @RequiredString('Address Line 1', 2, 255)
  addressLine1!: string;

  @ApiPropertyOptional({
    description: 'Secondary address line (street, area)',
    example: 'Near Central Park',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @RequiredString('Address Line 2', 1, 255)
  addressLine2?: string;

  @ApiPropertyOptional({
    description: 'Nearby landmark',
    example: 'Opposite Metro Station',
    minLength: 1,
    maxLength: 255,
  })
  @IsOptional()
  @RequiredString('Landmark', 1, 255)
  landmark?: string;

  @ApiProperty({
    description: 'Postal / ZIP code',
    example: '380001',
    minLength: 3,
    maxLength: 20,
  })
  @RequiredString('Pincode', 3, 20)
  @Matches(REGEX.PINCODE_REGEX, {
    message: i18nValidationMessage('validation.invalid', { field: 'Pincode' }),
  })
  pincode!: string;

  /**
   * cityId is resolved server-side by POST /address/resolve-coordinates and
   * returned to the map page, which then passes it back here.
   * This ensures the UUID always references a real row in the cities table.
   */
  @ApiProperty({
    description: 'City UUID — resolved by POST /address/resolve-coordinates',
    example: '2f9a8544-5ef9-4be2-a7ab-d5e0386c5f1a',
  })
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', { field: 'City ID' }),
  })
  cityId!: string;

  @ApiPropertyOptional({
    description: 'Latitude from the map pin',
    example: 23.0225,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({
    message: i18nValidationMessage('validation.invalid', { field: 'Latitude' }),
  })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude from the map pin',
    example: 72.5714,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Longitude',
    }),
  })
  longitude?: number;

  @ApiPropertyOptional({
    description: 'Contact person name for delivery',
    example: 'John Doe',
    minLength: 1,
    maxLength: 100,
  })
  @IsOptional()
  @RequiredString('Contact Name', 1, 100)
  contactName?: string;

  @ApiPropertyOptional({
    description: 'Contact phone number',
    example: '+919876543210',
    minLength: 7,
    maxLength: 20,
  })
  @IsOptional()
  @RequiredString('Contact Phone', 7, 20)
  contactPhone?: string;
}
