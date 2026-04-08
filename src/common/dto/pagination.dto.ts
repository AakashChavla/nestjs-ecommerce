import { IsOptional, IsInt, Min, Max, IsIn, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Page must be an integer number' })
  @Min(1, { message: 'Page must be at least 1' })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Limit must be an integer number' })
  @Min(1, { message: 'Limit must be at least 1' })
  @Max(100, { message: 'Limit cannot be greater than 100' })
  limit?: number = 10;

  @IsOptional()
  @IsString({ message: 'sortBy must be a valid string field name' })
  sortBy?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'], {
    message: 'sortOrder must be either ASC or DESC',
  })
  sortOrder?: 'ASC' | 'DESC' = 'DESC';

  @IsOptional()
  @IsString({ message: 'Search must be a string value' })
  search?: string;
}
