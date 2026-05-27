import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsLatitude, IsLongitude } from 'class-validator';
import { i18nValidationMessage } from 'nestjs-i18n';

export class ResolveCoordinatesDto {
  @ApiProperty({
    description: 'Latitude from map pin-drop',
    example: 21.1702,
    type: Number,
  })
  @Type(() => Number)
  @IsLatitude({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Latitude',
    }),
  })
  latitude!: number;

  @ApiProperty({
    description: 'Longitude from map pin-drop',
    example: 72.8311,
    type: Number,
  })
  @Type(() => Number)
  @IsLongitude({
    message: i18nValidationMessage('validation.invalid', {
      field: 'Longitude',
    }),
  })
  longitude!: number;
}
