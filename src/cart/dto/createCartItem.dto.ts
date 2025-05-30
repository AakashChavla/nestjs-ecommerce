import { IsNotEmpty, IsNumber, IsString } from 'class-validator';

export class CreateCartItemDto {
  @IsNotEmpty()
  @IsString()
  productId: string;

  @IsNotEmpty()
  @IsNumber()
  quantity: number;
}