import { ApiPropertyOptional } from '@nestjs/swagger';
import { ProductStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { PaginationDto } from 'src/common/dto/pagination.dto';

export class ProductFilterDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by category UUID',
    example: 'f2a8d4c5-5e3d-4c1c-9d1a-3e7d4a5b6c7d',
    type: String,
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Category ID',
    }),
  })
  categoryId?: string;

  @ApiPropertyOptional({
    description: 'Filter by seller UUID',
    example: 'c4b9c2d1-3f8b-4a1a-8fd2-9d1a3b5c7e91',
    type: String,
  })
  @IsOptional()
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Seller ID',
    }),
  })
  sellerId?: string;

  @ApiPropertyOptional({
    description: 'Filter by product status',
    enum: ProductStatus,
  })
  @IsOptional()
  @IsEnum(ProductStatus, {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Status',
    }),
  })
  status?: ProductStatus;

  @ApiPropertyOptional({
    description: 'Minimum selling price',
    example: 1000,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'Minimum Price',
      }),
    },
  )
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    description: 'Maximum selling price',
    example: 99999,
    type: Number,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber(
    { maxDecimalPlaces: 2 },
    {
      message: i18nValidationMessage('validation.invalid', {
        field: 'Maximum Price',
      }),
    },
  )
  @Min(0)
  maxPrice?: number;

  @ApiPropertyOptional({
    description: 'Filter by brand name',
    example: 'Apple',
    type: String,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Brand',
    }),
  })
  brand?: string;

  @ApiPropertyOptional({
    description: 'Only featured products',
    example: true,
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
    description: 'Only active products',
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
    description: 'Filter by tag UUIDs',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  tagIds?: string[];
}
