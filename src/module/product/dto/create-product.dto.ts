import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RequiredString } from 'src/common/helpers/validation/required-string.validation';

class ProductAttributeInputDto {
  @ApiProperty({
    description: 'Attribute UUID',
    example: '0c7b5be1-7f55-4f5a-b7c6-7c1e2d8c9b88',
    type: String,
    required: true,
  })
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Attribute ID',
    }),
  })
  attributeId!: string;

  @ApiProperty({
    description: 'Attribute value',
    example: 'Red',
    type: String,
    required: true,
  })
  @RequiredString('Attribute Value', 1, 255)
  value!: string;
}

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'iPhone 15 Pro',
    type: String,
    required: true,
  })
  @RequiredString('Name', 2, 300)
  name!: string;

  @ApiProperty({
    description: 'Product description',
    example: 'Latest flagship smartphone with A17 Pro chip',
    type: String,
    required: true,
  })
  @RequiredString('Description', 10, 5000)
  description!: string;

  @ApiProperty({
    description: 'Brand name',
    example: 'Apple',
    type: String,
    required: true,
  })
  @RequiredString('Brand', 1, 150)
  brand!: string;

  @ApiProperty({
    description: 'Category UUID',
    example: 'f2a8d4c5-5e3d-4c1c-9d1a-3e7d4a5b6c7d',
    type: String,
    required: true,
  })
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Category ID',
    }),
  })
  categoryId!: string;

  @ApiProperty({
    description: 'Maximum retail price (MRP)',
    example: 129999,
    type: Number,
    required: true,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'MRP',
      }),
    },
  )
  @Min(0)
  mrp!: number;

  @ApiProperty({
    description: 'Selling price',
    example: 119999,
    type: Number,
    required: true,
  })
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'Selling Price',
      }),
    },
  )
  @Min(0)
  sellingPrice!: number;

  @ApiPropertyOptional({
    description: 'Discount percentage',
    example: 10,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'Discount Percent',
      }),
    },
  )
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'INR',
    type: String,
  })
  @IsOptional()
  @RequiredString('Currency', 1, 10)
  currency?: string;

  @ApiPropertyOptional({
    description: 'Product status',
    enum: ProductStatus,
    example: ProductStatus.DRAFT,
  })
  @IsOptional()
  @IsEnum(ProductStatus, {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Status',
    }),
  })
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Set active status',
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
    description: 'Mark as featured',
    example: false,
    type: Boolean,
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Is Featured',
    }),
  })
  isFeatured?: boolean;

  @ApiPropertyOptional({
    description: 'Product attributes',
    type: [ProductAttributeInputDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ProductAttributeInputDto)
  attributes?: ProductAttributeInputDto[];

  @ApiPropertyOptional({
    description: 'Tag UUIDs linked to the product',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
