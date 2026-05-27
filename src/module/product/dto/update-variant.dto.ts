import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RequiredString } from 'src/common/helpers/validation/required-string.validation';

class VariantAttributeInputDto {
  @ApiPropertyOptional({
    description: 'Attribute UUID',
    example: '0c7b5be1-7f55-4f5a-b7c6-7c1e2d8c9b88',
    type: String,
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Attribute ID',
    }),
  })
  attributeId?: string;

  @ApiPropertyOptional({
    description: 'Attribute value',
    example: '128GB',
    type: String,
  })
  @IsOptional()
  @RequiredString('Attribute Value', 1, 255)
  value?: string;
}

export class UpdateVariantDto {
  @ApiPropertyOptional({
    description: 'Variant SKU',
    example: 'IPHONE-15-PRO-128-BLK',
    type: String,
  })
  @IsOptional()
  @RequiredString('SKU', 1, 100)
  sku?: string;

  @ApiPropertyOptional({
    description: 'Variant display name',
    example: '128GB / Midnight Black',
    type: String,
  })
  @IsOptional()
  @RequiredString('Variant Name', 1, 200)
  name?: string;

  @ApiPropertyOptional({
    description: 'Override selling price for this variant',
    example: 118999,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'Price Override',
      }),
    },
  )
  @Min(0)
  priceOverride?: number | null;

  @ApiPropertyOptional({
    description: 'Set active status for the variant',
    example: true,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Is Active',
    }),
  })
  isActive?: boolean;

  @ApiPropertyOptional({
    description: 'Variant attributes',
    type: [VariantAttributeInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantAttributeInputDto)
  attributes?: VariantAttributeInputDto[];
}
