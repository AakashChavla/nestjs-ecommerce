// ─── create-category.dto.ts ───────────────────────────────────────────────────

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { RequiredString } from 'src/common/helpers/validation/required-string.validation';

export class CreateCategoryDto {
  @ApiProperty({
    description: 'Display name of the category',
    example: 'Smartphones',
    type: String,
    required: true,
  })
  @RequiredString('Name', 2, 100)
  name!: string;

  @ApiPropertyOptional({
    description: 'URL-safe slug (auto-generated if not provided)',
    example: 'smartphones',
    type: String,
  })
  @IsOptional()
  @IsString({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Slug',
    }),
  })
  @MinLength(2, {
    message: i18nValidationMessage('validation.min_character', {
      field: 'Slug',
      count: 2,
    }),
  })
  @MaxLength(120, {
    message: i18nValidationMessage('validation.max_character', {
      field: 'Slug',
      count: 120,
    }),
  })
  slug?: string;

  @ApiPropertyOptional({
    description: 'Parent category UUID — omit for root categories',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    type: String,
  })
  @IsUUID('4', {
    message: i18nValidationMessage('validation.invalid', {
      field: 'Parent Category',
    }),
  })
  @IsOptional()
  parentId?: string;

  @ApiPropertyOptional({
    description: 'Icon URL or emoji for this category',
    example: '📱',
    type: String,
  })
  @IsOptional()
  @RequiredString('Icon URL', 1, 500)
  iconUrl?: string;

  @ApiPropertyOptional({
    description: 'Whether this category is visible on the platform',
    default: true,
    type: Boolean,
  })
  @IsBoolean({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Is Active',
    }),
  })
  @Type(() => Boolean)
  @IsOptional()
  isActive?: boolean = true;
}
