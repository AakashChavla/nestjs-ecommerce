import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { RequiredString } from 'src/common/helpers/validation/RequiredString.validation';
import { REGEX } from '../../../common/constant/regex';

export class CreateAddressDto {
  @ApiProperty({
    description: 'Type of entity that owns this address',
    enum: AddressOwnerType,
    example: AddressOwnerType.USER,
    required: true,
  })
  @IsEnum(AddressOwnerType, {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Owner Type',
    }),
  })
  ownerType!: AddressOwnerType;

  @ApiProperty({
    description: 'Owner id (UUID)',
    example: 'cf84f0e4-3fc2-4cd7-97ec-2b6326fd4c75',
    required: true,
  })
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Owner ID',
    }),
  })
  ownerId!: string;

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
    description: 'Primary address line',
    example: '221B Baker Street',
    minLength: 2,
    maxLength: 255,
    required: true,
  })
  @RequiredString('Address Line 1', 2, 255)
  addressLine1!: string;

  @ApiPropertyOptional({
    description: 'Secondary address line',
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
    description: 'Postal/ZIP code',
    example: '110001',
    minLength: 3,
    maxLength: 20,
    required: true,
  })
  @RequiredString('Pincode', 3, 20)
  @Matches(REGEX.PINCODE_REGEX, {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Pincode',
    }),
  })
  pincode!: string;

  @ApiProperty({
    description: 'City id (UUID)',
    example: '2f9a8544-5ef9-4be2-a7ab-d5e0386c5f1a',
    required: true,
  })
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'City ID',
    }),
  })
  cityId!: string;

  @ApiPropertyOptional({
    description: 'Latitude coordinate',
    example: 28.6139,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Latitude',
    }),
  })
  latitude?: number;

  @ApiPropertyOptional({
    description: 'Longitude coordinate',
    example: 77.209,
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
    description: 'Contact phone for delivery',
    example: '+91 98765 43210',
    minLength: 7,
    maxLength: 20,
  })
  @IsOptional()
  @RequiredString('Contact Phone', 7, 20)
  @Matches(REGEX.PHONE_REGEX, {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Contact Phone',
    }),
  })
  contactPhone?: string;
}
